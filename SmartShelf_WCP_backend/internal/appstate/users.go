package appstate

import (
	"context"
	"fmt"
	"strings"
)

func (s *State) UsersByKind(ctx context.Context, kind, country, city, workplace string, page, limit int) ([]User, int, error) {
	page, limit = normalizePagination(page, limit)
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	conditions := ` WHERE kind = $1 AND deleted_at IS NULL`
	values := []any{kind}
	if country != "" && !strings.EqualFold(country, "all") {
		values = append(values, country)
		conditions += ` AND country = $` + fmt.Sprintf("%d", len(values))
	}
	if city != "" && !strings.EqualFold(city, "all") {
		values = append(values, city)
		conditions += ` AND city = $` + fmt.Sprintf("%d", len(values))
	}
	if workplace != "" && !strings.EqualFold(workplace, "all") {
		values = append(values, workplace)
		conditions += ` AND workplace = $` + fmt.Sprintf("%d", len(values))
	}

	var total int
	if err := s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM users`+conditions, values...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("users count: %w", err)
	}

	values = append(values, limit, offsetFromPage(page, limit))
	query := `
		SELECT id, name, surname, avatar, email, role, country, city, workplace
		FROM users` + conditions + `
		ORDER BY id ASC
		LIMIT $` + fmt.Sprintf("%d", len(values)-1) + ` OFFSET $` + fmt.Sprintf("%d", len(values))

	rows, err := s.db.Query(queryCtx, query, values...)
	if err != nil {
		return nil, 0, fmt.Errorf("users list: %w", err)
	}
	defer rows.Close()

	items := make([]User, 0)
	for rows.Next() {
		var item User
		if err := rows.Scan(&item.ID, &item.Name, &item.Surname, &item.Avatar, &item.Email, &item.Role, &item.Country, &item.City, &item.Workplace); err != nil {
			return nil, 0, fmt.Errorf("users scan: %w", err)
		}
		items = append(items, item)
	}

	return items, total, nil
}

func (s *State) UserByID(ctx context.Context, kind string, id int64) (User, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item User
	err := s.db.QueryRow(queryCtx, `
		SELECT id, name, surname, avatar, email, role, country, city, workplace
		FROM users
		WHERE kind = $1 AND id = $2 AND deleted_at IS NULL
	`, kind, id).Scan(&item.ID, &item.Name, &item.Surname, &item.Avatar, &item.Email, &item.Role, &item.Country, &item.City, &item.Workplace)
	if err != nil {
		if isNoRows(err) {
			return User{}, false, nil
		}
		return User{}, false, fmt.Errorf("user by id: %w", err)
	}

	return item, true, nil
}

func (s *State) CreateUser(ctx context.Context, kind string, input UserUpsert) (User, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item User
	err := s.db.QueryRow(queryCtx, `
		INSERT INTO users (kind, name, surname, avatar, email, role, country, city, workplace)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, name, surname, avatar, email, role, country, city, workplace
	`, kind, input.Name, input.Surname, nullableStringPointer(input.Avatar), input.Email, input.Role, input.Country, input.City, input.Workplace).Scan(
		&item.ID, &item.Name, &item.Surname, &item.Avatar, &item.Email, &item.Role, &item.Country, &item.City, &item.Workplace,
	)
	if err != nil {
		return User{}, fmt.Errorf("create user: %w", err)
	}

	return item, nil
}

func (s *State) UpdateUser(ctx context.Context, kind string, id int64, input UserUpsert) (User, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	var item User
	err := s.db.QueryRow(queryCtx, `
		UPDATE users
		SET name = $3, surname = $4, avatar = $5, email = $6, role = $7, country = $8, city = $9, workplace = $10, updated_at = NOW()
		WHERE kind = $1 AND id = $2 AND deleted_at IS NULL
		RETURNING id, name, surname, avatar, email, role, country, city, workplace
	`, kind, id, input.Name, input.Surname, nullableStringPointer(input.Avatar), input.Email, input.Role, input.Country, input.City, input.Workplace).Scan(
		&item.ID, &item.Name, &item.Surname, &item.Avatar, &item.Email, &item.Role, &item.Country, &item.City, &item.Workplace,
	)
	if err != nil {
		if isNoRows(err) {
			return User{}, false, nil
		}
		return User{}, false, fmt.Errorf("update user: %w", err)
	}

	return item, true, nil
}

func (s *State) DeleteUser(ctx context.Context, kind string, id int64) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	command, err := s.db.Exec(queryCtx, `UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE kind = $1 AND id = $2 AND deleted_at IS NULL`, kind, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if command.RowsAffected() == 0 {
		return errNotFound
	}

	return nil
}
