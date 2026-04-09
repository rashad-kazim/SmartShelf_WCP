package appstate

import (
	"context"
	"fmt"
)

func (s *State) seedData(ctx context.Context) error {
	if err := s.removeLegacySeedData(ctx); err != nil {
		return err
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
			('admin', 'Admin', 'User', $1, 'Administrator', 'Headquarters', $2, '["dashboard.view","stores.view","stores.edit","stores.delete","stores.logs.view","installation.create","notifications.view","users.company.view","users.supermarket.view"]'::jsonb, true, '[]'::jsonb)
		ON CONFLICT (email) DO UPDATE
		SET
			name = EXCLUDED.name,
			surname = EXCLUDED.surname,
			role = EXCLUDED.role,
			workplace = EXCLUDED.workplace,
			password_hash = EXCLUDED.password_hash,
			permissions = EXCLUDED.permissions,
			all_countries = EXCLUDED.all_countries,
			countries = EXCLUDED.countries,
			updated_at = NOW()
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

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("seed commit: %w", err)
	}

	return nil
}

func (s *State) removeLegacySeedData(ctx context.Context) error {
	legacyEmails := []string{
		"david@smartshelf.ai",
		"laura@smartshelf.ai",
		"james@smartshelf.ai",
		"john@smartshelf.ai",
		"alice@smartshelf.ai",
		"bob@smartshelf.ai",
		"maria@smartshelf.ai",
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("legacy seed cleanup begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, `DELETE FROM notifications WHERE id = ANY($1)`, []string{
		"notification-1",
		"notification-2",
		"notification-3",
		"notification-4",
		"notification-5",
	}); err != nil {
		return fmt.Errorf("legacy notifications cleanup: %w", err)
	}

	if _, err = tx.Exec(ctx, `DELETE FROM activities WHERE id = ANY($1)`, []string{
		"activity-1",
		"activity-2",
		"activity-3",
		"activity-4",
	}); err != nil {
		return fmt.Errorf("legacy activities cleanup: %w", err)
	}

	if _, err = tx.Exec(ctx, `
		DELETE FROM activities
		WHERE message_key = 'device_connected_msg'
		  AND details_key = 'log_esp32_prov_success'
		  AND time_key = 'mins_ago'
	`); err != nil {
		return fmt.Errorf("placeholder activities cleanup: %w", err)
	}

	if _, err = tx.Exec(ctx, `DELETE FROM stores WHERE name = ANY($1)`, []string{
		"Supermarket A",
		"Supermarket B",
		"Supermarket C",
		"Supermarket D",
	}); err != nil {
		return fmt.Errorf("legacy stores cleanup: %w", err)
	}

	if _, err = tx.Exec(ctx, `DELETE FROM users WHERE email = ANY($1)`, legacyEmails); err != nil {
		return fmt.Errorf("legacy users cleanup: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("legacy seed cleanup commit: %w", err)
	}

	return nil
}
