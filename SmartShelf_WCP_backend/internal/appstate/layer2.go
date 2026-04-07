package appstate

import (
	"context"
	"fmt"
	"time"
)

type HeartbeatPayload struct {
	StoreID         int64  `json:"store_id"`
	Status          string `json:"status"`
	Layer1Version   string `json:"layer1_version"`
	Layer2Version   string `json:"layer2_version"`
	SyncStatus      string `json:"sync_status"`
	PendingSyncData int    `json:"pending_sync_data"`
}

func (s *State) IngestHeartbeat(ctx context.Context, payload HeartbeatPayload) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	command, err := s.db.Exec(queryCtx, `
		UPDATE layer2_summaries
		SET status = $2, layer1_version = COALESCE(NULLIF($3, ''), layer1_version), layer2_version = COALESCE(NULLIF($4, ''), layer2_version),
			sync_status = COALESCE(NULLIF($5, ''), sync_status), pending_sync_data = $6, last_heartbeat_at = NOW()
		WHERE store_id = $1
	`, payload.StoreID, payload.Status, payload.Layer1Version, payload.Layer2Version, payload.SyncStatus, payload.PendingSyncData)
	if err != nil {
		return fmt.Errorf("heartbeat update: %w", err)
	}
	if command.RowsAffected() == 0 {
		return errNotFound
	}

	return nil
}

func (s *State) IngestSync(ctx context.Context, payload SyncPayload) (string, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	cacheKey := "layer2:sync:" + payload.BatchID
	ok, err := s.redis.SetNX(queryCtx, cacheKey, "1", 24*time.Hour).Result()
	if err != nil {
		return "", fmt.Errorf("sync idempotency: %w", err)
	}
	if !ok {
		return "duplicate", nil
	}

	tx, err := s.db.Begin(queryCtx)
	if err != nil {
		return "", fmt.Errorf("sync begin: %w", err)
	}
	defer tx.Rollback(queryCtx)

	for _, log := range payload.Logs {
		loggedAt := log.LoggedAt
		if loggedAt.IsZero() {
			loggedAt = time.Now().UTC()
		}
		reportIndex := log.ReportIndex
		if reportIndex == "" {
			reportIndex = deriveReportIndex(loggedAt)
		}
		_, err = tx.Exec(queryCtx, `
			INSERT INTO device_logs (store_id, device_id, firmware_version, battery, voltage, rssi, report_index, report_type, status_code, soc_temp, logged_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`, payload.StoreID, log.DeviceID, log.Firmware, log.Battery, log.Voltage, log.RSSI, reportIndex, log.ReportType, log.StatusCode, log.SocTemp, loggedAt)
		if err != nil {
			return "", fmt.Errorf("sync insert log: %w", err)
		}
	}

	_, err = tx.Exec(queryCtx, `
		UPDATE layer2_summaries
		SET last_sync_at = NOW(), sync_status = 'synced', pending_sync_data = 0
		WHERE store_id = $1
	`, payload.StoreID)
	if err != nil {
		return "", fmt.Errorf("sync update layer2: %w", err)
	}

	if err = tx.Commit(queryCtx); err != nil {
		return "", fmt.Errorf("sync commit: %w", err)
	}

	return "accepted", nil
}
