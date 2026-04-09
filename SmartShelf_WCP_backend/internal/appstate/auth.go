package appstate

import (
	"context"
	"fmt"
)

type AdminAuthResult string

const (
	AdminAuthSuccess          AdminAuthResult = "success"
	AdminAuthEmailNotFound    AdminAuthResult = "email_not_found"
	AdminAuthWrongPassword    AdminAuthResult = "wrong_password"
	AdminAuthForbiddenAccount AdminAuthResult = "forbidden_account"
)

func (s *State) AuthenticateAdmin(ctx context.Context, email, password string) (AuthUser, AdminAuthResult, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	const query = `
		SELECT id, name, email, role, password_hash, permissions, all_countries, countries, kind
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
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
		kind         string
	)

	if err := s.db.QueryRow(queryCtx, query, email).Scan(&id, &name, &userEmail, &role, &passwordHash, &permissions, &allCountries, &countries, &kind); err != nil {
		if isNoRows(err) {
			return AuthUser{}, AdminAuthEmailNotFound, nil
		}
		return AuthUser{}, "", fmt.Errorf("select admin: %w", err)
	}

	if kind != "admin" {
		return AuthUser{}, AdminAuthForbiddenAccount, nil
	}

	if !compareSecret(passwordHash, password) {
		return AuthUser{}, AdminAuthWrongPassword, nil
	}

	preferences, err := s.PreferencesByUserID(queryCtx, id)
	if err != nil {
		return AuthUser{}, "", err
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
	}, AdminAuthSuccess, nil
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
