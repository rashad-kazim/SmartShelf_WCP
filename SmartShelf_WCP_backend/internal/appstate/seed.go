package appstate

import (
	"context"
	"fmt"
	"time"
)

func (s *State) seedData(ctx context.Context) error {
	var count int
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM stores`).Scan(&count); err != nil {
		return fmt.Errorf("seed stores count: %w", err)
	}
	if count > 0 {
		return nil
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("seed begin: %w", err)
	}
	defer tx.Rollback(ctx)

	adminHash, err := hashSecret(s.cfg.SeedAdminPassword)
	if err != nil {
		return fmt.Errorf("seed admin hash: %w", err)
	}

	if _, err = tx.Exec(ctx, `
		INSERT INTO users (kind, name, surname, email, role, workplace, password_hash, permissions, all_countries, countries)
		VALUES
			('admin', 'Admin', 'User', $1, 'Administrator', 'Headquarters', $2, '["dashboard.view","stores.view","stores.edit","stores.delete","stores.logs.view","installation.create","notifications.view","users.company.view","users.supermarket.view"]'::jsonb, true, '["Germany","France","UK"]'::jsonb),
			('company', 'David', 'Jones', 'david@smartshelf.ai', 'Administrator', 'Headquarters', '', '[]'::jsonb, true, '["Germany","France","UK"]'::jsonb),
			('company', 'Laura', 'Taylor', 'laura@smartshelf.ai', 'Analyst', 'Headquarters', '', '[]'::jsonb, true, '["Germany","France","UK"]'::jsonb),
			('company', 'James', 'Brown', 'james@smartshelf.ai', 'Engineer', 'Headquarters', '', '[]'::jsonb, true, '["Germany","France","UK"]'::jsonb),
			('supermarket', 'John', 'Doe', 'john@smartshelf.ai', 'Store Manager', 'Supermarket A', '', '[]'::jsonb, false, '["Germany"]'::jsonb),
			('supermarket', 'Alice', 'Smith', 'alice@smartshelf.ai', 'Cashier', 'Supermarket B', '', '[]'::jsonb, false, '["France"]'::jsonb),
			('supermarket', 'Bob', 'Wilson', 'bob@smartshelf.ai', 'Stock Keeper', 'Supermarket C', '', '[]'::jsonb, false, '["UK"]'::jsonb),
			('supermarket', 'Maria', 'Garcia', 'maria@smartshelf.ai', 'Cashier', 'Supermarket A', '', '[]'::jsonb, false, '["Germany"]'::jsonb)
	`, s.cfg.SeedAdminEmail, adminHash); err != nil {
		return fmt.Errorf("seed users: %w", err)
	}

	if _, err = tx.Exec(ctx, `
		INSERT INTO user_preferences (user_id, language, theme, sidebar_collapsed)
		SELECT id, 'en', 'light', false
		FROM users
		ON CONFLICT (user_id) DO NOTHING
	`); err != nil {
		return fmt.Errorf("seed user preferences: %w", err)
	}

	now := time.Now().UTC()
	storeIDs := make([]int64, 0, 4)
	storeRows := []struct {
		name, country, city, address, branch, status, openHour, closeHour, ownerName, ownerSurname string
		devices                                                                            int
		createdAt                                                                          time.Time
	}{
		{"Supermarket A", "Germany", "Berlin", "Alexanderplatz 1, Berlin", "", "Active", "09:00", "22:00", "Hans", "Zimmer", 27, now.AddDate(0, 0, -2)},
		{"Supermarket B", "France", "Paris", "Rue de Rivoli 20, Paris", "", "Inactive", "08:00", "21:00", "Marie", "Dupont", 13, now.AddDate(0, 0, -8)},
		{"Supermarket C", "UK", "London", "Baker Street 12, London", "", "Active", "08:30", "22:30", "Oliver", "Stone", 15, now.AddDate(0, 0, -17)},
		{"Supermarket D", "France", "Lyon", "Bellecour 4, Lyon", "", "Active", "09:00", "21:30", "Emma", "Bernard", 9, now.AddDate(0, 0, -26)},
	}

	for _, item := range storeRows {
		var id int64
		if err = tx.QueryRow(ctx, `
			INSERT INTO stores (name, country, city, address, branch_name, status, device_count, opening_hour, closing_hour, owner_name, owner_surname, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
			RETURNING id
		`, item.name, item.country, item.city, item.address, item.branch, item.status, item.devices, item.openHour, item.closeHour, item.ownerName, item.ownerSurname, item.createdAt).Scan(&id); err != nil {
			return fmt.Errorf("seed store: %w", err)
		}
		storeIDs = append(storeIDs, id)
	}

	layer2Rows := []struct {
		storeID                         int64
		layer2ID, layer1Version, layer2Version, status, syncStatus, gatewayIP, gatewayEndpoint string
		esp32Count, pendingSync, gatewayPort int
		lastHeartbeat, lastSync time.Time
	}{
		{storeIDs[0], "L2-STORE-001", "v1.0.0", "v2.4.1", "online", "synced", "192.168.1.50", "/api/v1/ingest", 27, 0, 8080, now.Add(-8 * time.Minute), now.Add(-5 * time.Minute)},
		{storeIDs[1], "L2-STORE-002", "v1.0.0", "v2.3.8", "pending", "pending", "192.168.1.51", "/api/v1/ingest", 13, 127, 8080, now.Add(-48 * time.Minute), now.Add(-70 * time.Minute)},
		{storeIDs[2], "L2-STORE-003", "v1.1.0", "v2.4.0", "offline", "failed", "192.168.1.52", "/api/v1/ingest", 15, 391, 8080, now.Add(-3 * time.Hour), now.Add(-4 * time.Hour)},
		{storeIDs[3], "L2-STORE-004", "v1.1.0", "v2.4.1", "online", "synced", "192.168.1.53", "/api/v1/ingest", 9, 12, 8080, now.Add(-15 * time.Minute), now.Add(-10 * time.Minute)},
	}
	for _, item := range layer2Rows {
		if _, err = tx.Exec(ctx, `
			INSERT INTO layer2_summaries (
				store_id, layer2_id, layer1_version, layer2_version, esp32_count, status,
				last_heartbeat_at, last_sync_at, sync_status, pending_sync_data, gateway_ip, gateway_port, gateway_endpoint
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		`, item.storeID, item.layer2ID, item.layer1Version, item.layer2Version, item.esp32Count, item.status, item.lastHeartbeat, item.lastSync, item.syncStatus, item.pendingSync, item.gatewayIP, item.gatewayPort, item.gatewayEndpoint); err != nil {
			return fmt.Errorf("seed layer2: %w", err)
		}
	}

	logRows := []struct {
		storeID                                                                       int64
		deviceID, firmware, reportIndex, reportType                                  string
		battery, rssi, statusCode                                                     int
		voltage, socTemp                                                              float64
		loggedAt                                                                      time.Time
	}{
		{storeIDs[0], "ESP-32-001", "v1.0.4", "Closing Logs", "scheduled", 95, -55, 0, 3.80, 28.2, now.Add(-10 * time.Minute)},
		{storeIDs[0], "ESP-32-002", "v1.0.4", "Closing Logs", "scheduled", 72, -65, 0, 3.70, 29.0, now.Add(-20 * time.Minute)},
		{storeIDs[0], "ESP-32-003", "v1.0.3", "Middle Logs", "alert", 45, -75, 101, 3.60, 34.1, now.Add(-2 * time.Hour)},
		{storeIDs[1], "ESP-64-001", "v1.0.5", "Closing Logs", "scheduled", 88, -58, 0, 3.79, 27.4, now.Add(-30 * time.Minute)},
		{storeIDs[1], "ESP-64-002", "v1.0.4", "Middle Logs", "handshake", 61, -69, 0, 3.68, 28.6, now.Add(-4 * time.Hour)},
		{storeIDs[2], "ESP-96-001", "v1.0.1", "Middle Logs", "alert", 9, -77, 103, 3.52, 36.5, now.Add(-80 * time.Minute)},
		{storeIDs[2], "ESP-96-002", "v1.0.1", "Opening Logs", "scheduled", 19, -88, 102, 3.44, 37.3, now.Add(-11 * time.Hour)},
		{storeIDs[3], "ESP-55-001", "v1.0.6", "Closing Logs", "scheduled", 81, -60, 0, 3.74, 27.1, now.Add(-40 * time.Minute)},
	}
	for _, item := range logRows {
		if _, err = tx.Exec(ctx, `
			INSERT INTO device_logs (store_id, device_id, firmware_version, battery, voltage, rssi, report_index, report_type, status_code, soc_temp, logged_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`, item.storeID, item.deviceID, item.firmware, item.battery, item.voltage, item.rssi, item.reportIndex, item.reportType, item.statusCode, item.socTemp, item.loggedAt); err != nil {
			return fmt.Errorf("seed device logs: %w", err)
		}
	}

	storeDeviceRows := []struct {
		storeID     int64
		deviceNo    int64
		country     string
		city        string
		storeName   string
		branchName  string
		screenSize  string
		allDayWork  bool
		awakeTime   string
		sleepTime   string
		gatewayIP   string
		gatewayPort string
		endpoint    string
		wifiSSID    string
		wifiPass    string
		fontJSON    string
		status      string
		statusCode  int
		reportType  string
		socTemp     float64
	}{
		{storeIDs[0], 1, "Germany", "Berlin", "Supermarket A", "", "130cm", true, "", "", "192.168.1.50", "8080", "/api/v1/ingest", "Store_WiFi", "password123", `{"productName":"24px","priceBefore":"16px","priceAfter":"32px","barcode":"12px","barcodeNumbers":"12px"}`, "active", 0, "scheduled", 25.1},
		{storeIDs[0], 2, "Germany", "Berlin", "Supermarket A", "", "110cm", false, "08:00", "22:00", "192.168.1.50", "8080", "/api/v1/ingest", "Store_WiFi", "password123", `{"productName":"18px","priceBefore":"14px","priceAfter":"28px","barcode":"12px","barcodeNumbers":"12px"}`, "paired", 0, "handshake", 24.2},
		{storeIDs[0], 3, "Germany", "Berlin", "Supermarket A", "", "80cm", false, "09:00", "21:00", "192.168.1.50", "8080", "/api/v1/ingest", "Store_WiFi", "password123", `{"productName":"16px","priceBefore":"12px","priceAfter":"24px","barcode":"10px","barcodeNumbers":"10px"}`, "unhealthy", 103, "alert", 29.8},
		{storeIDs[0], 4, "Germany", "Berlin", "Supermarket A", "", "130cm", false, "08:00", "20:00", "192.168.1.50", "8080", "/api/v1/ingest", "Store_WiFi", "password123", `{"productName":"20px","priceBefore":"14px","priceAfter":"30px","barcode":"12px","barcodeNumbers":"12px"}`, "offline", 102, "scheduled", 26.4},
	}
	for _, item := range storeDeviceRows {
		if _, err = tx.Exec(ctx, `
			INSERT INTO store_devices (
				store_id, device_number, country, city, store_name, branch_name, esp_token_masked, screen_size,
				all_day_work, awake_time, sleep_time, gateway_ip, gateway_port, gateway_endpoint, wifi_ssid,
				wifi_password, font_settings, status, status_code, last_report_type, soc_temp
			) VALUES ($1,$2,$3,$4,$5,$6,'********',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20)
		`, item.storeID, item.deviceNo, item.country, item.city, item.storeName, item.branchName, item.screenSize, item.allDayWork,
			item.awakeTime, item.sleepTime, item.gatewayIP, item.gatewayPort, item.endpoint, item.wifiSSID, s.encryptSecretValue(item.wifiPass),
			item.fontJSON, item.status, item.statusCode, item.reportType, item.socTemp); err != nil {
			return fmt.Errorf("seed store devices: %w", err)
		}
	}

	if _, err = tx.Exec(ctx, `
		INSERT INTO activities (id, message_key, details_key, time_key, occurred_at)
		VALUES
			('activity-1', 'device_connected_msg', 'log_esp32_prov_success', 'mins_ago', $1),
			('activity-2', 'device_connected_msg', 'log_esp32_prov_success', 'mins_ago', $2),
			('activity-3', 'device_connected_msg', 'log_esp32_prov_success', 'mins_ago', $3),
			('activity-4', 'device_connected_msg', 'log_esp32_prov_success', 'mins_ago', $4)
	`, now.Add(-7*time.Minute), now.Add(-22*time.Minute), now.Add(-90*time.Minute), now.Add(-3*time.Hour)); err != nil {
		return fmt.Errorf("seed activities: %w", err)
	}

	if _, err = tx.Exec(ctx, `
		INSERT INTO notifications (id, title_key, description_key, time_key, category, severity, event_type, entity_id, is_read, requires_ack, acknowledged_at, silenced_at, href, created_at)
		VALUES
			('notification-1', 'notification_store_offline_title', 'notification_store_offline_desc', 'time_just_now', 'store', 'critical', 'store_offline', 'store-3', false, true, NULL, NULL, '/stores/3/logs', $1),
			('notification-2', 'notification_low_battery_title', 'notification_low_battery_desc', 'time_5_minutes_ago', 'store', 'warning', 'low_battery', 'device-5', false, false, NULL, NULL, '/stores/2/logs', $2),
			('notification-3', 'notification_firmware_fail_title', 'notification_firmware_fail_desc', 'time_10_minutes_ago', 'system', 'error', 'firmware_update_fail', 'store-2', false, true, NULL, NULL, '/stores/2/logs', $3),
			('notification-4', 'notification_user_role_title', 'notification_user_role_desc', 'time_2_hours_ago', 'user', 'info', 'new_user_added', 'user-12', true, false, NULL, NULL, '/company-employees', $4),
			('notification-5', 'notification_unauthorized_access_title', 'notification_unauthorized_access_desc', 'time_yesterday', 'system', 'critical', 'unauthorized_access', 'store-1', false, true, NULL, NULL, '/stores/1/logs', $5)
	`, now.Add(-3*time.Minute), now.Add(-5*time.Minute), now.Add(-10*time.Minute), now.Add(-2*time.Hour), now.Add(-24*time.Hour)); err != nil {
		return fmt.Errorf("seed notifications: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("seed commit: %w", err)
	}

	return nil
}
