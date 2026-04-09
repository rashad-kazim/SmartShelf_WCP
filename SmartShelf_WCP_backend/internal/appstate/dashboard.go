package appstate

import (
	"context"
	"fmt"
	"time"
)

func (s *State) Dashboard(ctx context.Context, args DashboardQueryArgs) (DashboardSummary, error) {
	if args.Range == "" {
		args.Range = DashboardRange7d
	}
	if args.Country == "" {
		args.Country = "all"
	}
	if args.City == "" {
		args.City = "all"
	}

	availableCountries, err := s.Countries(ctx, "stores")
	if err != nil {
		return DashboardSummary{}, err
	}
	availableCountryNames := make([]string, 0, len(availableCountries))
	for _, country := range availableCountries {
		availableCountryNames = append(availableCountryNames, country.Name)
	}
	availableCities, err := s.Cities(ctx, "stores", args.Country)
	if err != nil {
		return DashboardSummary{}, err
	}

	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	conditions, values := storeFiltersSQL(args.Country, args.City)

	var countriesCount int
	if err = s.db.QueryRow(queryCtx, `SELECT COUNT(DISTINCT country) FROM stores WHERE deleted_at IS NULL`+conditions, values...).Scan(&countriesCount); err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard countries: %w", err)
	}

	var citiesCount int
	if err = s.db.QueryRow(queryCtx, `SELECT COUNT(DISTINCT city) FROM stores WHERE deleted_at IS NULL`+conditions, values...).Scan(&citiesCount); err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard cities: %w", err)
	}

	var totalDevices int
	if err = s.db.QueryRow(queryCtx, `SELECT COALESCE(SUM(device_count), 0) FROM stores WHERE deleted_at IS NULL`+conditions, values...).Scan(&totalDevices); err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard devices: %w", err)
	}

	var totalStores int
	if err = s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM stores WHERE deleted_at IS NULL`+conditions, values...).Scan(&totalStores); err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard stores total: %w", err)
	}

	var coveredStores int
	if err = s.db.QueryRow(
		queryCtx,
		`SELECT COUNT(*) FROM stores WHERE deleted_at IS NULL AND status = 'Active' AND device_count > 0`+conditions,
		values...,
	).Scan(&coveredStores); err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard covered stores: %w", err)
	}

	var pendingAckCount int
	if err = s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM notifications WHERE requires_ack = true AND acknowledged_at IS NULL AND silenced_at IS NULL`).Scan(&pendingAckCount); err != nil {
		return DashboardSummary{}, fmt.Errorf("dashboard pending ack: %w", err)
	}

	since, labels := dashboardRangeWindow(args.Range)
	addedStoresTrend, storesAddedTotal, err := s.loadStoreTrend(queryCtx, args, since, labels)
	if err != nil {
		return DashboardSummary{}, err
	}
	criticalErrorsTrend, criticalErrors, err := s.loadCriticalTrend(queryCtx, args, since, labels)
	if err != nil {
		return DashboardSummary{}, err
	}

	return DashboardSummary{
		CountriesCount:      countriesCount,
		CitiesCount:         citiesCount,
		TotalDevices:        totalDevices,
		CriticalErrors:      criticalErrors,
		PendingAckCount:     pendingAckCount,
		StoresAddedTotal:    storesAddedTotal,
		AddedStoresTrend:    addedStoresTrend,
		CriticalErrorsTrend: criticalErrorsTrend,
		Highlights: []DashboardHighlight{
			{ID: "coverage", TitleKey: "dashboard_highlight_coverage", Value: fmt.Sprintf("%d%%", coveragePercentage(coveredStores, totalStores)), Tone: "brand"},
			{ID: "alerts", TitleKey: "dashboard_highlight_pending_ack", Value: fmt.Sprintf("%d", pendingAckCount), Tone: toneFromPendingAck(pendingAckCount)},
			{ID: "stores", TitleKey: "dashboard_highlight_store_growth", Value: fmt.Sprintf("+%d", storesAddedTotal), Tone: "success"},
		},
		AvailableCountries: availableCountryNames,
		AvailableCities:    availableCities,
	}, nil
}

func (s *State) loadStoreTrend(ctx context.Context, args DashboardQueryArgs, since time.Time, labels []string) ([]DashboardTrendPoint, int, error) {
	conditions, values := storeFiltersSQL(args.Country, args.City)
	values = append(values, since)
	query := `
		SELECT created_at
		FROM stores
		WHERE deleted_at IS NULL` + conditions + ` AND created_at >= $` + fmt.Sprintf("%d", len(values)) + `
	`

	rows, err := s.db.Query(ctx, query, values...)
	if err != nil {
		return nil, 0, fmt.Errorf("dashboard stores trend: %w", err)
	}
	defer rows.Close()

	buckets := make(map[string]int, len(labels))
	for _, label := range labels {
		buckets[label] = 0
	}
	total := 0
	for rows.Next() {
		var createdAt time.Time
		if err := rows.Scan(&createdAt); err != nil {
			return nil, 0, fmt.Errorf("dashboard stores trend scan: %w", err)
		}
		label := dashboardBucketLabel(args.Range, createdAt)
		buckets[label]++
		total++
	}

	trend := make([]DashboardTrendPoint, 0, len(labels))
	for _, label := range labels {
		trend = append(trend, DashboardTrendPoint{Label: label, Value: buckets[label]})
	}
	return trend, total, nil
}

func (s *State) loadCriticalTrend(ctx context.Context, args DashboardQueryArgs, since time.Time, labels []string) ([]DashboardTrendPoint, int, error) {
	query := `
		SELECT n.created_at
		FROM notifications n
		LEFT JOIN stores st ON ('store-' || st.id::text) = n.entity_id
		WHERE n.severity IN ('critical', 'error') AND n.created_at >= $1
	`
	values := []any{since}
	if args.Country != "" && args.Country != "all" {
		values = append(values, args.Country)
		query += ` AND st.country = $` + fmt.Sprintf("%d", len(values))
	}
	if args.City != "" && args.City != "all" {
		values = append(values, args.City)
		query += ` AND st.city = $` + fmt.Sprintf("%d", len(values))
	}

	rows, err := s.db.Query(ctx, query, values...)
	if err != nil {
		return nil, 0, fmt.Errorf("dashboard critical trend: %w", err)
	}
	defer rows.Close()

	buckets := make(map[string]int, len(labels))
	for _, label := range labels {
		buckets[label] = 0
	}
	total := 0
	for rows.Next() {
		var createdAt time.Time
		if err := rows.Scan(&createdAt); err != nil {
			return nil, 0, fmt.Errorf("dashboard critical trend scan: %w", err)
		}
		label := dashboardBucketLabel(args.Range, createdAt)
		buckets[label]++
		total++
	}

	trend := make([]DashboardTrendPoint, 0, len(labels))
	for _, label := range labels {
		trend = append(trend, DashboardTrendPoint{Label: label, Value: buckets[label]})
	}
	return trend, total, nil
}

func (s *State) ActivityFeed(ctx context.Context) ([]ActivityItem, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	rows, err := s.db.Query(queryCtx, `
		SELECT id, message_key, details_key, time_key, occurred_at
		FROM activities
		ORDER BY occurred_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("activity feed: %w", err)
	}
	defer rows.Close()

	items := make([]ActivityItem, 0)
	for rows.Next() {
		var item ActivityItem
		if err := rows.Scan(&item.ID, &item.MessageKey, &item.DetailsKey, &item.TimeKey, &item.OccurredAt); err != nil {
			return nil, fmt.Errorf("activity feed scan: %w", err)
		}
		items = append(items, item)
	}

	return items, nil
}

func toneFromPendingAck(value int) string {
	if value > 0 {
		return "warning"
	}
	return "success"
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func coveragePercentage(coveredStores, totalStores int) int {
	if totalStores <= 0 {
		return 0
	}
	return int(float64(coveredStores) / float64(totalStores) * 100)
}
