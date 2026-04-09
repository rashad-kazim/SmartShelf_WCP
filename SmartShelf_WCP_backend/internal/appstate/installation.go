package appstate

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

func (s *State) CreateInstallationDraft(ctx context.Context, input InstallationDraft) (InstallationDraft, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	item := input
	item.ID = uuid.NewString()
	item.CreatedAt = time.Now().UTC()
	item.UpdatedAt = item.CreatedAt

	_, err := s.db.Exec(queryCtx, `
		INSERT INTO installation_drafts (
			id, country, city, store_name, is_branch, branch_name, address,
			all_day_open, opening_hour, closing_hour, owner_name, owner_surname,
			created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
	`, item.ID, item.Country, item.City, item.StoreName, item.IsBranch, item.BranchName, item.Address, item.AllDayOpen, item.OpeningHour, item.ClosingHour, item.OwnerName, item.OwnerSurname, item.CreatedAt)
	if err != nil {
		return InstallationDraft{}, fmt.Errorf("create installation draft: %w", err)
	}

	return item, nil
}

func (s *State) UpdateInstallationDraft(ctx context.Context, id string, input InstallationDraft) (InstallationDraft, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item InstallationDraft
	err := s.db.QueryRow(queryCtx, `
		UPDATE installation_drafts
		SET country = $2, city = $3, store_name = $4, is_branch = $5, branch_name = $6, address = $7,
			all_day_open = $8, opening_hour = $9, closing_hour = $10, owner_name = $11, owner_surname = $12, updated_at = NOW()
		WHERE id = $1
		RETURNING id, country, city, store_name, is_branch, branch_name, address, all_day_open, opening_hour, closing_hour, owner_name, owner_surname,
			(master_token_hash <> ''), (esp_token_hash <> ''), connection_ok, created_at, updated_at, completed_at
	`, id, input.Country, input.City, input.StoreName, input.IsBranch, input.BranchName, input.Address, input.AllDayOpen, input.OpeningHour, input.ClosingHour, input.OwnerName, input.OwnerSurname).Scan(
		&item.ID, &item.Country, &item.City, &item.StoreName, &item.IsBranch, &item.BranchName, &item.Address, &item.AllDayOpen, &item.OpeningHour,
		&item.ClosingHour, &item.OwnerName, &item.OwnerSurname, &item.MasterTokenSet, &item.ESPTokenSet, &item.ConnectionOK, &item.CreatedAt, &item.UpdatedAt, &item.CompletedAt,
	)
	if err != nil {
		if isNoRows(err) {
			return InstallationDraft{}, false, nil
		}
		return InstallationDraft{}, false, fmt.Errorf("update installation draft: %w", err)
	}

	return item, true, nil
}

func (s *State) GenerateMasterToken(ctx context.Context, id string) (string, bool, error) {
	return s.generateDraftToken(ctx, id, "master_token_hash")
}

func (s *State) GenerateESPToken(ctx context.Context, id string) (string, bool, error) {
	return s.generateDraftToken(ctx, id, "esp_token_hash")
}

func (s *State) generateDraftToken(ctx context.Context, id, column string) (string, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	token, err := randomToken(24)
	if err != nil {
		return "", false, fmt.Errorf("generate token: %w", err)
	}
	hashValue, err := hashSecret(token)
	if err != nil {
		return "", false, fmt.Errorf("hash token: %w", err)
	}

	command, err := s.db.Exec(queryCtx, `UPDATE installation_drafts SET `+column+` = $2, updated_at = NOW() WHERE id = $1`, id, hashValue)
	if err != nil {
		return "", false, fmt.Errorf("save token: %w", err)
	}
	if command.RowsAffected() == 0 {
		return "", false, nil
	}

	return token, true, nil
}

func (s *State) CheckDraftConnection(ctx context.Context, id string) (bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	command, err := s.db.Exec(queryCtx, `UPDATE installation_drafts SET connection_ok = true, updated_at = NOW() WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("check draft connection: %w", err)
	}
	return command.RowsAffected() > 0, nil
}

func (s *State) SaveDraftDevices(ctx context.Context, draftID string, devices []DraftDevice) (int, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var exists bool
	if err := s.db.QueryRow(queryCtx, `SELECT EXISTS(SELECT 1 FROM installation_drafts WHERE id = $1)`, draftID).Scan(&exists); err != nil {
		return 0, false, fmt.Errorf("draft devices exists: %w", err)
	}
	if !exists {
		return 0, false, nil
	}

	tx, err := s.db.Begin(queryCtx)
	if err != nil {
		return 0, false, fmt.Errorf("draft devices begin: %w", err)
	}
	defer tx.Rollback(queryCtx)

	command, err := tx.Exec(queryCtx, `DELETE FROM draft_devices WHERE draft_id = $1`, draftID)
	if err != nil {
		return 0, false, fmt.Errorf("draft devices delete old: %w", err)
	}

	_ = command

	for index, device := range devices {
		fontSettings, _ := json.Marshal(device.FontSettings)
			_, err = tx.Exec(queryCtx, `
				INSERT INTO draft_devices (
					draft_id, device_order, country, city, store_name, branch_name, esp_token, screen_size,
					all_day_work, awake_time, sleep_time, gateway_ip, gateway_port, gateway_endpoint,
					wifi_ssid, wifi_password, font_settings, status, status_code, last_report_type, soc_temp
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
			`, draftID, index+1, device.Country, device.City, device.StoreName, device.BranchName, maskedToken(device.ESPToken), device.ScreenSize, device.AllDayWork,
				device.AwakeTime, device.SleepTime, device.GatewayIP, device.GatewayPort, device.GatewayEndpoint, device.WifiSSID, s.encryptSecretValue(device.WifiPassword),
				fontSettings, device.Status, device.StatusCode, device.LastReportType, device.SocTemp)
		if err != nil {
			return 0, false, fmt.Errorf("draft devices insert: %w", err)
		}
	}

	if err = tx.Commit(queryCtx); err != nil {
		return 0, false, fmt.Errorf("draft devices commit: %w", err)
	}

	return len(devices), true, nil
}

func (s *State) CompleteInstallation(ctx context.Context, draftID, idempotencyKey string) (CompleteInstallationResult, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	resultKey := "installation:complete:" + idempotencyKey
	if cached, err := s.redis.Get(queryCtx, resultKey).Result(); err == nil && cached != "" {
		var result CompleteInstallationResult
		if json.Unmarshal([]byte(cached), &result) == nil {
			return result, nil
		}
	}

	set, err := s.redis.SetNX(queryCtx, resultKey+":lock", "1", 24*time.Hour).Result()
	if err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation idempotency: %w", err)
	}
	if !set {
		return CompleteInstallationResult{}, fmt.Errorf("installation already in progress")
	}

	tx, err := s.db.Begin(queryCtx)
	if err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation begin: %w", err)
	}
	defer tx.Rollback(queryCtx)

	var draft InstallationDraft
	err = tx.QueryRow(queryCtx, `
		SELECT id, country, city, store_name, is_branch, branch_name, address, all_day_open, opening_hour, closing_hour, owner_name, owner_surname,
			(master_token_hash <> ''), (esp_token_hash <> ''), connection_ok, created_at, updated_at, completed_at
		FROM installation_drafts
		WHERE id = $1
	`, draftID).Scan(
		&draft.ID, &draft.Country, &draft.City, &draft.StoreName, &draft.IsBranch, &draft.BranchName, &draft.Address,
		&draft.AllDayOpen, &draft.OpeningHour, &draft.ClosingHour, &draft.OwnerName, &draft.OwnerSurname,
		&draft.MasterTokenSet, &draft.ESPTokenSet, &draft.ConnectionOK, &draft.CreatedAt, &draft.UpdatedAt, &draft.CompletedAt,
	)
	if err != nil {
		if isNoRows(err) {
			return CompleteInstallationResult{}, errNotFound
		}
		return CompleteInstallationResult{}, fmt.Errorf("installation draft load: %w", err)
	}

	var deviceCount int
	if err = tx.QueryRow(queryCtx, `SELECT COUNT(*) FROM draft_devices WHERE draft_id = $1`, draftID).Scan(&deviceCount); err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation device count: %w", err)
	}

	var storeID int64
	storeStatus := "Active"
	if !draft.ConnectionOK {
		storeStatus = "Inactive"
	}
	if err = tx.QueryRow(queryCtx, `
		INSERT INTO stores (name, country, city, address, branch_name, status, device_count, opening_hour, closing_hour, owner_name, owner_surname, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
		RETURNING id
	`, draft.StoreName, draft.Country, draft.City, draft.Address, draft.BranchName, storeStatus, deviceCount, draft.OpeningHour, draft.ClosingHour, draft.OwnerName, draft.OwnerSurname).Scan(&storeID); err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation create store: %w", err)
	}

	_, err = tx.Exec(queryCtx, `
		INSERT INTO layer2_summaries (
			store_id, layer2_id, layer1_version, layer2_version, esp32_count, status, last_heartbeat_at, last_sync_at, sync_status, pending_sync_data, gateway_ip, gateway_port, gateway_endpoint
		)
		SELECT $1, 'L2-' || UPPER(SUBSTRING(REPLACE($2, ' ', ''), 1, 8)), 'pending', 'pending', COUNT(*), 'pending', NULL, NULL, 'pending', 0,
			COALESCE(MAX(gateway_ip), ''), COALESCE(NULLIF(MAX(gateway_port), '')::int, 0), COALESCE(MAX(gateway_endpoint), '')
		FROM draft_devices
		WHERE draft_id = $3
	`, storeID, draft.StoreName, draftID)
	if err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation create layer2: %w", err)
	}

	_, err = tx.Exec(queryCtx, `
		INSERT INTO store_devices (
			store_id, device_number, country, city, store_name, branch_name, esp_token_masked, screen_size,
			all_day_work, awake_time, sleep_time, gateway_ip, gateway_port, gateway_endpoint, wifi_ssid,
			wifi_password, font_settings, status, status_code, last_report_type, soc_temp, created_at, updated_at
		)
		SELECT
			$1, device_order, country, city, store_name, branch_name, '********', screen_size,
			all_day_work, awake_time, sleep_time, gateway_ip, gateway_port, gateway_endpoint, wifi_ssid,
			wifi_password, font_settings, status, status_code, last_report_type, soc_temp, NOW(), NOW()
		FROM draft_devices
		WHERE draft_id = $2
	`, storeID, draftID)
	if err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation create store devices: %w", err)
	}

	_, err = tx.Exec(queryCtx, `
		UPDATE installation_drafts
		SET completed_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, draftID)
	if err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation finalize draft: %w", err)
	}

	if err = tx.Commit(queryCtx); err != nil {
		return CompleteInstallationResult{}, fmt.Errorf("installation commit: %w", err)
	}

	result := CompleteInstallationResult{
		DraftID:  draftID,
		StoreID:  storeID,
		Status:   "completed",
		Location: fmt.Sprintf("/stores/%d/summary", storeID),
	}
	payload, _ := json.Marshal(result)
	_ = s.redis.Set(queryCtx, resultKey, string(payload), 24*time.Hour).Err()

	return result, nil
}
