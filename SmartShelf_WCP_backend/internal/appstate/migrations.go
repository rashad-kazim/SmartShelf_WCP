package appstate

import (
	"context"
	"fmt"
)

func (s *State) runMigrations(ctx context.Context) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			kind TEXT NOT NULL,
			name TEXT NOT NULL,
			surname TEXT NOT NULL DEFAULT '',
			avatar TEXT,
			email TEXT NOT NULL UNIQUE,
			role TEXT NOT NULL,
			country TEXT NOT NULL DEFAULT '',
			city TEXT NOT NULL DEFAULT '',
			workplace TEXT NOT NULL DEFAULT '',
			password_hash TEXT NOT NULL DEFAULT '',
			permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
			all_countries BOOLEAN NOT NULL DEFAULT false,
			countries JSONB NOT NULL DEFAULT '[]'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			deleted_at TIMESTAMPTZ
		)`,
		`CREATE TABLE IF NOT EXISTS stores (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			country TEXT NOT NULL,
			city TEXT NOT NULL,
			address TEXT NOT NULL DEFAULT '',
			branch_name TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL,
			device_count INTEGER NOT NULL DEFAULT 0,
			opening_hour TEXT NOT NULL DEFAULT '',
			closing_hour TEXT NOT NULL DEFAULT '',
			owner_name TEXT NOT NULL DEFAULT '',
			owner_surname TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			deleted_at TIMESTAMPTZ
		)`,
		`CREATE TABLE IF NOT EXISTS layer2_summaries (
			store_id BIGINT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
			layer2_id TEXT NOT NULL,
			layer1_version TEXT NOT NULL DEFAULT '',
			layer2_version TEXT NOT NULL DEFAULT '',
			esp32_count INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL,
			last_heartbeat_at TIMESTAMPTZ,
			last_sync_at TIMESTAMPTZ,
			sync_status TEXT NOT NULL DEFAULT 'pending',
			pending_sync_data INTEGER NOT NULL DEFAULT 0,
			gateway_ip TEXT NOT NULL DEFAULT '',
			gateway_port INTEGER NOT NULL DEFAULT 0,
			gateway_endpoint TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS device_logs (
			id BIGSERIAL PRIMARY KEY,
			store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
			device_id TEXT NOT NULL,
			firmware_version TEXT NOT NULL,
			battery INTEGER NOT NULL,
			voltage DOUBLE PRECISION NOT NULL,
			rssi INTEGER NOT NULL,
			report_index TEXT NOT NULL DEFAULT 'closing',
			report_type TEXT NOT NULL,
			status_code INTEGER NOT NULL DEFAULT 0,
			soc_temp DOUBLE PRECISION NOT NULL DEFAULT 0,
			logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE device_logs ADD COLUMN IF NOT EXISTS report_index TEXT NOT NULL DEFAULT 'closing'`,
		`ALTER TABLE device_logs ALTER COLUMN report_index SET DEFAULT 'closing'`,
		`CREATE INDEX IF NOT EXISTS idx_device_logs_store_date ON device_logs (store_id, logged_at DESC)`,
		`CREATE TABLE IF NOT EXISTS activities (
			id TEXT PRIMARY KEY,
			message_key TEXT NOT NULL,
			details_key TEXT NOT NULL,
			time_key TEXT NOT NULL,
			occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS notifications (
			id TEXT PRIMARY KEY,
			title_key TEXT NOT NULL,
			description_key TEXT NOT NULL,
			time_key TEXT NOT NULL,
			category TEXT NOT NULL,
			severity TEXT NOT NULL,
			event_type TEXT NOT NULL,
			entity_id TEXT NOT NULL DEFAULT '',
			is_read BOOLEAN NOT NULL DEFAULT false,
			requires_ack BOOLEAN NOT NULL DEFAULT false,
			acknowledged_at TIMESTAMPTZ,
			silenced_at TIMESTAMPTZ,
			href TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS user_preferences (
			user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			language TEXT NOT NULL DEFAULT 'en',
			theme TEXT NOT NULL DEFAULT 'light',
			sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS installation_drafts (
			id TEXT PRIMARY KEY,
			country TEXT NOT NULL DEFAULT '',
			city TEXT NOT NULL DEFAULT '',
			store_name TEXT NOT NULL DEFAULT '',
			is_branch BOOLEAN NOT NULL DEFAULT false,
			branch_name TEXT NOT NULL DEFAULT '',
			address TEXT NOT NULL DEFAULT '',
			all_day_open BOOLEAN NOT NULL DEFAULT false,
			opening_hour TEXT NOT NULL DEFAULT '',
			closing_hour TEXT NOT NULL DEFAULT '',
			owner_name TEXT NOT NULL DEFAULT '',
			owner_surname TEXT NOT NULL DEFAULT '',
			master_token_hash TEXT NOT NULL DEFAULT '',
			esp_token_hash TEXT NOT NULL DEFAULT '',
			connection_ok BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			completed_at TIMESTAMPTZ
		)`,
		`CREATE TABLE IF NOT EXISTS draft_devices (
			id BIGSERIAL PRIMARY KEY,
			draft_id TEXT NOT NULL REFERENCES installation_drafts(id) ON DELETE CASCADE,
			device_order INTEGER NOT NULL,
			country TEXT NOT NULL DEFAULT '',
			city TEXT NOT NULL DEFAULT '',
			store_name TEXT NOT NULL DEFAULT '',
			branch_name TEXT NOT NULL DEFAULT '',
			esp_token TEXT NOT NULL DEFAULT '',
			screen_size TEXT NOT NULL DEFAULT '',
			all_day_work BOOLEAN NOT NULL DEFAULT false,
			awake_time TEXT NOT NULL DEFAULT '',
			sleep_time TEXT NOT NULL DEFAULT '',
			gateway_ip TEXT NOT NULL DEFAULT '',
			gateway_port TEXT NOT NULL DEFAULT '',
			gateway_endpoint TEXT NOT NULL DEFAULT '',
			wifi_ssid TEXT NOT NULL DEFAULT '',
			wifi_password TEXT NOT NULL DEFAULT '',
			font_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
			status TEXT NOT NULL DEFAULT 'pending',
			status_code INTEGER NOT NULL DEFAULT 0,
			last_report_type TEXT NOT NULL DEFAULT 'scheduled',
			soc_temp DOUBLE PRECISION NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS store_devices (
			id BIGSERIAL PRIMARY KEY,
			store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
			device_number BIGINT NOT NULL,
			country TEXT NOT NULL DEFAULT '',
			city TEXT NOT NULL DEFAULT '',
			store_name TEXT NOT NULL DEFAULT '',
			branch_name TEXT NOT NULL DEFAULT '',
			esp_token_masked TEXT NOT NULL DEFAULT '********',
			screen_size TEXT NOT NULL DEFAULT '',
			all_day_work BOOLEAN NOT NULL DEFAULT false,
			awake_time TEXT NOT NULL DEFAULT '',
			sleep_time TEXT NOT NULL DEFAULT '',
			gateway_ip TEXT NOT NULL DEFAULT '',
			gateway_port TEXT NOT NULL DEFAULT '',
			gateway_endpoint TEXT NOT NULL DEFAULT '',
			wifi_ssid TEXT NOT NULL DEFAULT '',
			wifi_password TEXT NOT NULL DEFAULT '',
			font_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
			status TEXT NOT NULL DEFAULT 'pending',
			status_code INTEGER NOT NULL DEFAULT 0,
			last_report_type TEXT NOT NULL DEFAULT 'scheduled',
			soc_temp DOUBLE PRECISION NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(store_id, device_number)
		)`,
	}

	for _, statement := range statements {
		if _, err := s.db.Exec(ctx, statement); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}
