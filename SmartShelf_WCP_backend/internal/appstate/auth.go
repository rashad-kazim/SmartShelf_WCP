package appstate

import (
	"context"
	"fmt"
)

func (s *State) AuthenticateAdmin(ctx context.Context, email, password string) (AuthUser, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	const query = `
		SELECT id, name, email, role, password_hash, permissions, all_countries, countries
		FROM users
		WHERE kind = 'admin' AND email = $1 AND deleted_at IS NULL
		LIMIT 1
	`

	var (
		id           int64
		name         string
		userEmail    string
		role         string
		passwordHash string
		permissions  []byte
		allCountries bool
		countries    []byte
	)

	if err := s.db.QueryRow(queryCtx, query, email).Scan(&id, &name, &userEmail, &role, &passwordHash, &permissions, &allCountries, &countries); err != nil {
		if isNoRows(err) {
			return AuthUser{}, false, nil
		}
		return AuthUser{}, false, fmt.Errorf("select admin: %w", err)
	}

	if !compareSecret(passwordHash, password) {
		return AuthUser{}, false, nil
	}

	preferences, err := s.PreferencesByUserID(queryCtx, id)
	if err != nil {
		return AuthUser{}, false, err
	}

	return AuthUser{
		ID:          fmt.Sprintf("%d", id),
		Name:        name,
		Email:       userEmail,
		Role:        role,
		Permissions: unmarshalStringList(permissions),
		Scope: PermissionSet{
			AllCountries: allCountries,
			Countries:    unmarshalStringList(countries),
		},
		Preferences: preferences,
	}, true, nil
}

func (s *State) Admin(ctx context.Context) (AuthUser, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	const query = `
		SELECT id, name, email, role, permissions, all_countries, countries
		FROM users
		WHERE kind = 'admin' AND deleted_at IS NULL
		ORDER BY id ASC
		LIMIT 1
	`

	var (
		id           int64
		name         string
		email        string
		role         string
		permissions  []byte
		allCountries bool
		countries    []byte
	)

	if err := s.db.QueryRow(queryCtx, query).Scan(&id, &name, &email, &role, &permissions, &allCountries, &countries); err != nil {
		return AuthUser{}, fmt.Errorf("select admin: %w", err)
	}

	preferences, err := s.PreferencesByUserID(queryCtx, id)
	if err != nil {
		return AuthUser{}, err
	}

	return AuthUser{
		ID:          fmt.Sprintf("%d", id),
		Name:        name,
		Email:       email,
		Role:        role,
		Permissions: unmarshalStringList(permissions),
		Scope: PermissionSet{
			AllCountries: allCountries,
			Countries:    unmarshalStringList(countries),
		},
		Preferences: preferences,
	}, nil
}

func (s *State) AdminByID(ctx context.Context, userID int64) (AuthUser, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	const query = `
		SELECT id, name, email, role, permissions, all_countries, countries
		FROM users
		WHERE kind = 'admin' AND id = $1 AND deleted_at IS NULL
		LIMIT 1
	`

	var (
		id           int64
		name         string
		email        string
		role         string
		permissions  []byte
		allCountries bool
		countries    []byte
	)

	if err := s.db.QueryRow(queryCtx, query, userID).Scan(&id, &name, &email, &role, &permissions, &allCountries, &countries); err != nil {
		if isNoRows(err) {
			return AuthUser{}, false, nil
		}
		return AuthUser{}, false, fmt.Errorf("select admin by id: %w", err)
	}

	preferences, err := s.PreferencesByUserID(queryCtx, id)
	if err != nil {
		return AuthUser{}, false, err
	}

	return AuthUser{
		ID:          fmt.Sprintf("%d", id),
		Name:        name,
		Email:       email,
		Role:        role,
		Permissions: unmarshalStringList(permissions),
		Scope: PermissionSet{
			AllCountries: allCountries,
			Countries:    unmarshalStringList(countries),
		},
		Preferences: preferences,
	}, true, nil
}
