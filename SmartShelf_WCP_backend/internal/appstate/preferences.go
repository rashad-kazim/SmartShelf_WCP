package appstate

import (
	"context"
	"fmt"
)

func (s *State) PreferencesByUserID(ctx context.Context, userID int64) (UserPreferences, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item UserPreferences
	err := s.db.QueryRow(queryCtx, `
		SELECT language, theme, sidebar_collapsed
		FROM user_preferences
		WHERE user_id = $1
	`, userID).Scan(&item.Language, &item.Theme, &item.SidebarCollapsed)
	if err != nil {
		if isNoRows(err) {
			return UserPreferences{
				Language:         "en",
				Theme:            "light",
				SidebarCollapsed: false,
			}, nil
		}
		return UserPreferences{}, fmt.Errorf("preferences by user: %w", err)
	}

	return item, nil
}

func (s *State) PreferencesByEmail(ctx context.Context, email string) (UserPreferences, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item UserPreferences
	err := s.db.QueryRow(queryCtx, `
		SELECT p.language, p.theme, p.sidebar_collapsed
		FROM user_preferences p
		INNER JOIN users u ON u.id = p.user_id
		WHERE u.email = $1 AND u.deleted_at IS NULL
		LIMIT 1
	`, email).Scan(&item.Language, &item.Theme, &item.SidebarCollapsed)
	if err != nil {
		if isNoRows(err) {
			return UserPreferences{}, false, nil
		}
		return UserPreferences{}, false, fmt.Errorf("preferences by email: %w", err)
	}

	return item, true, nil
}

func (s *State) UpsertPreferences(ctx context.Context, userID int64, input UserPreferences) (UserPreferences, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item UserPreferences
	err := s.db.QueryRow(queryCtx, `
		INSERT INTO user_preferences (user_id, language, theme, sidebar_collapsed, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (user_id) DO UPDATE
		SET language = EXCLUDED.language,
			theme = EXCLUDED.theme,
			sidebar_collapsed = EXCLUDED.sidebar_collapsed,
			updated_at = NOW()
		RETURNING language, theme, sidebar_collapsed
	`, userID, input.Language, input.Theme, input.SidebarCollapsed).Scan(&item.Language, &item.Theme, &item.SidebarCollapsed)
	if err != nil {
		return UserPreferences{}, fmt.Errorf("upsert preferences: %w", err)
	}

	return item, nil
}
