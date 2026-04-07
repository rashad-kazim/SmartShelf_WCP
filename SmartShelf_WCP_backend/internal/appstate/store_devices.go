package appstate

import (
	"context"
	"encoding/json"
	"fmt"
)

func (s *State) StoreDevices(ctx context.Context, storeID int64) ([]StoreDevice, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	rows, err := s.db.Query(queryCtx, `
		SELECT id, store_id, device_number, country, city, store_name, branch_name, esp_token_masked, screen_size,
			all_day_work, awake_time, sleep_time, gateway_ip, gateway_port, gateway_endpoint, wifi_ssid,
			wifi_password, font_settings, status, status_code, last_report_type, soc_temp
		FROM store_devices
		WHERE store_id = $1
		ORDER BY device_number ASC
	`, storeID)
	if err != nil {
		return nil, fmt.Errorf("store devices list: %w", err)
	}
	defer rows.Close()

	items := make([]StoreDevice, 0)
	for rows.Next() {
		var (
			item         StoreDevice
			deviceNumber int64
			fontSettings []byte
		)
		if err = rows.Scan(
			&item.ID,
			&item.StoreID,
			&deviceNumber,
			&item.Country,
			&item.City,
			&item.StoreName,
			&item.BranchName,
			&item.ESPToken,
			&item.ScreenSize,
			&item.AllDayWork,
			&item.AwakeTime,
			&item.SleepTime,
			&item.GatewayIP,
			&item.GatewayPort,
			&item.GatewayEndpoint,
			&item.WifiSSID,
			&item.WifiPassword,
			&fontSettings,
			&item.Status,
			&item.StatusCode,
			&item.LastReportType,
			&item.SocTemp,
			); err != nil {
				return nil, fmt.Errorf("store devices scan: %w", err)
			}
			item.ID = deviceNumber
			item.WifiPassword = s.decryptSecretValue(item.WifiPassword)
			if err = json.Unmarshal(fontSettings, &item.FontSettings); err != nil {
				item.FontSettings = DeviceFontSettings{}
			}
		items = append(items, item)
	}

	return items, nil
}

func (s *State) ReplaceStoreDevices(ctx context.Context, storeID int64, devices []StoreDevice) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	tx, err := s.db.Begin(queryCtx)
	if err != nil {
		return fmt.Errorf("store devices begin: %w", err)
	}
	defer tx.Rollback(queryCtx)

	if _, err = tx.Exec(queryCtx, `DELETE FROM store_devices WHERE store_id = $1`, storeID); err != nil {
		return fmt.Errorf("store devices delete old: %w", err)
	}

	for _, device := range devices {
		fontSettings, _ := json.Marshal(device.FontSettings)
		if _, err = tx.Exec(queryCtx, `
			INSERT INTO store_devices (
				store_id, device_number, country, city, store_name, branch_name, esp_token_masked, screen_size,
				all_day_work, awake_time, sleep_time, gateway_ip, gateway_port, gateway_endpoint, wifi_ssid,
				wifi_password, font_settings, status, status_code, last_report_type, soc_temp, created_at, updated_at
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW())
			`, storeID, device.ID, device.Country, device.City, device.StoreName, device.BranchName, maskedToken(device.ESPToken),
				device.ScreenSize, device.AllDayWork, device.AwakeTime, device.SleepTime, device.GatewayIP, device.GatewayPort,
				device.GatewayEndpoint, device.WifiSSID, s.encryptSecretValue(device.WifiPassword), fontSettings, device.Status, device.StatusCode,
				device.LastReportType, device.SocTemp); err != nil {
				return fmt.Errorf("store devices insert: %w", err)
			}
	}

	if _, err = tx.Exec(queryCtx, `UPDATE stores SET device_count = $2, updated_at = NOW() WHERE id = $1`, storeID, len(devices)); err != nil {
		return fmt.Errorf("store devices count: %w", err)
	}

	if len(devices) > 0 {
		first := devices[0]
		if _, err = tx.Exec(queryCtx, `
			UPDATE layer2_summaries
			SET esp32_count = $2, gateway_ip = $3, gateway_port = $4::int, gateway_endpoint = $5
			WHERE store_id = $1
		`, storeID, len(devices), first.GatewayIP, zeroIfEmpty(first.GatewayPort), first.GatewayEndpoint); err != nil {
			return fmt.Errorf("store devices layer2 sync: %w", err)
		}
	}

	if err = tx.Commit(queryCtx); err != nil {
		return fmt.Errorf("store devices commit: %w", err)
	}

	return nil
}

func (s *State) UpdateStore(ctx context.Context, storeID int64, input StoreUpsert) (Store, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	status := "Active"
	var item Store
	err := s.db.QueryRow(queryCtx, `
		UPDATE stores
		SET name = $2, country = $3, city = $4, branch_name = $5, address = $6, opening_hour = $7, closing_hour = $8,
			owner_name = $9, owner_surname = $10, status = $11, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, name, country, city, status, device_count, address, branch_name, opening_hour, closing_hour, owner_name, owner_surname, created_at
	`, storeID, input.StoreName, input.Country, input.City, input.BranchName, input.Address, input.OpeningHour, input.ClosingHour,
		input.OwnerName, input.OwnerSurname, status).Scan(
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
		return Store{}, false, fmt.Errorf("update store: %w", err)
	}

	return item, true, nil
}
