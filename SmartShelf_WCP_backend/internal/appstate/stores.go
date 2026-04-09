package appstate

import (
	"context"
	"fmt"
	"strings"
	"time"
)

func (s *State) Stores(ctx context.Context, country, city, supermarket string, page, limit int) ([]Store, int, error) {
	page, limit = normalizePagination(page, limit)
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	conditions, values := storeFiltersSQL(country, city)
	if supermarket != "" && !strings.EqualFold(supermarket, "all") {
		values = append(values, supermarket)
		conditions += ` AND name = $` + fmt.Sprintf("%d", len(values))
	}

	var total int
	if err := s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM stores WHERE deleted_at IS NULL`+conditions, values...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("stores count: %w", err)
	}

	values = append(values, limit, offsetFromPage(page, limit))
	query := `
		SELECT id, name, country, city, status, device_count, address, branch_name, opening_hour, closing_hour, owner_name, owner_surname, created_at
		FROM stores
		WHERE deleted_at IS NULL` + conditions + `
		ORDER BY id ASC
		LIMIT $` + fmt.Sprintf("%d", len(values)-1) + ` OFFSET $` + fmt.Sprintf("%d", len(values))

	rows, err := s.db.Query(queryCtx, query, values...)
	if err != nil {
		return nil, 0, fmt.Errorf("stores list: %w", err)
	}
	defer rows.Close()

	items := make([]Store, 0)
	for rows.Next() {
		var item Store
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Country,
			&item.City,
			&item.Status,
			&item.Devices,
			&item.Address,
			&item.BranchName,
			&item.OpeningHour,
			&item.ClosingHour,
			&item.OwnerName,
			&item.OwnerSurname,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("stores scan: %w", err)
		}
		items = append(items, item)
	}

	return items, total, nil
}

func (s *State) StoreByID(ctx context.Context, id int64) (Store, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item Store
	err := s.db.QueryRow(queryCtx, `
		SELECT id, name, country, city, status, device_count, address, branch_name, opening_hour, closing_hour, owner_name, owner_surname, created_at
		FROM stores
		WHERE id = $1 AND deleted_at IS NULL
	`, id).Scan(
		&item.ID,
		&item.Name,
		&item.Country,
		&item.City,
		&item.Status,
		&item.Devices,
		&item.Address,
		&item.BranchName,
		&item.OpeningHour,
		&item.ClosingHour,
		&item.OwnerName,
		&item.OwnerSurname,
		&item.CreatedAt,
	)
	if err != nil {
		if isNoRows(err) {
			return Store{}, false, nil
		}
		return Store{}, false, fmt.Errorf("store by id: %w", err)
	}

	return item, true, nil
}

func (s *State) Layer2ByStoreID(ctx context.Context, storeID int64) (Layer2Summary, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item Layer2Summary
	err := s.db.QueryRow(queryCtx, `
		SELECT store_id, layer2_id, layer1_version, layer2_version, esp32_count, status,
			last_heartbeat_at, last_sync_at, sync_status, pending_sync_data, gateway_ip, gateway_port, gateway_endpoint
		FROM layer2_summaries
		WHERE store_id = $1
	`, storeID).Scan(
		&item.StoreID,
		&item.Layer2ID,
		&item.Layer1Version,
		&item.Layer2Version,
		&item.ESP32Count,
		&item.Status,
		&item.LastHeartbeatAt,
		&item.LastSyncAt,
		&item.SyncStatus,
		&item.PendingSyncData,
		&item.GatewayIP,
		&item.GatewayPort,
		&item.GatewayEndpoint,
	)
	if err != nil {
		if isNoRows(err) {
			return Layer2Summary{}, false, nil
		}
		return Layer2Summary{}, false, fmt.Errorf("layer2 by store: %w", err)
	}

	return item, true, nil
}

func (s *State) DeviceLogs(ctx context.Context, storeID int64, filter DeviceLogFilter) ([]DeviceLog, int, error) {
	page, limit := normalizePagination(filter.Page, filter.Limit)
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	conditions := ` WHERE store_id = $1`
	values := []any{storeID}
	conditions += ` AND logged_at >= NOW() - INTERVAL '30 days'`

	if strings.TrimSpace(filter.Date) != "" {
		values = append(values, filter.Date)
		conditions += ` AND DATE(logged_at) = $` + fmt.Sprintf("%d", len(values))
	}
	if strings.TrimSpace(filter.PacketIndex) != "" && !strings.EqualFold(filter.PacketIndex, "all") {
		values = append(values, reportIndexVariants(filter.PacketIndex))
		conditions += ` AND report_index = ANY($` + fmt.Sprintf("%d", len(values)) + `::text[])`
	}
	switch strings.TrimSpace(filter.BatteryStatus) {
	case "<25":
		conditions += ` AND battery < 25`
	case "25-50":
		conditions += ` AND battery >= 25 AND battery <= 50`
	case "50-75":
		conditions += ` AND battery >= 50 AND battery <= 75`
	case "75-100":
		conditions += ` AND battery >= 75 AND battery <= 100`
	}
	if strings.TrimSpace(filter.ReportType) != "" && !strings.EqualFold(filter.ReportType, "all") {
		values = append(values, filter.ReportType)
		conditions += ` AND report_type = $` + fmt.Sprintf("%d", len(values))
	}
	if strings.TrimSpace(filter.StatusCode) != "" && !strings.EqualFold(filter.StatusCode, "all") {
		values = append(values, filter.StatusCode)
		conditions += ` AND status_code = $` + fmt.Sprintf("%d", len(values))
	}
	if filter.CriticalOnly {
		conditions += ` AND status_code > 0`
	}

	var total int
	if err := s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM device_logs`+conditions, values...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("device logs count: %w", err)
	}

	values = append(values, limit, offsetFromPage(page, limit))
	query := `
		SELECT id, store_id, device_id, firmware_version, battery, voltage, rssi, report_index, report_type, status_code, soc_temp, logged_at
		FROM device_logs` + conditions + `
		ORDER BY logged_at DESC
		LIMIT $` + fmt.Sprintf("%d", len(values)-1) + ` OFFSET $` + fmt.Sprintf("%d", len(values))

	rows, err := s.db.Query(queryCtx, query, values...)
	if err != nil {
		return nil, 0, fmt.Errorf("device logs list: %w", err)
	}
	defer rows.Close()

	items := make([]DeviceLog, 0)
	for rows.Next() {
		var item DeviceLog
		if err := rows.Scan(
			&item.ID,
			&item.StoreID,
			&item.DeviceID,
			&item.Firmware,
			&item.Battery,
			&item.Voltage,
			&item.RSSI,
			&item.ReportIndex,
			&item.ReportType,
			&item.StatusCode,
			&item.SocTemp,
			&item.LoggedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("device logs scan: %w", err)
		}
		item.ReportIndex = normalizeReportIndex(item.ReportIndex)
		items = append(items, item)
	}

	return items, total, nil
}

func (s *State) DeleteStore(ctx context.Context, storeID int64) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	command, err := s.db.Exec(queryCtx, `UPDATE stores SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL`, storeID, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("delete store: %w", err)
	}
	if command.RowsAffected() == 0 {
		return errNotFound
	}

	return nil
}

func storeFiltersSQL(country, city string) (string, []any) {
	conditions := ""
	values := make([]any, 0)
	if country != "" && !strings.EqualFold(country, "all") {
		values = append(values, country)
		conditions += ` AND country = $` + fmt.Sprintf("%d", len(values))
	}
	if city != "" && !strings.EqualFold(city, "all") {
		values = append(values, city)
		conditions += ` AND city = $` + fmt.Sprintf("%d", len(values))
	}
	return conditions, values
}
