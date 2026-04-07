package appstate

import (
	"context"
	"fmt"
)

func (s *State) Countries(ctx context.Context) ([]string, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	rows, err := s.db.Query(queryCtx, `SELECT DISTINCT country FROM stores WHERE deleted_at IS NULL ORDER BY country ASC`)
	if err != nil {
		return nil, fmt.Errorf("countries: %w", err)
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("countries scan: %w", err)
		}
		result = append(result, value)
	}

	return result, nil
}

func (s *State) Cities(ctx context.Context, country string) ([]string, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	query := `SELECT DISTINCT city FROM stores WHERE deleted_at IS NULL`
	values := []any{}
	if country != "" && country != "all" {
		values = append(values, country)
		query += ` AND country = $1`
	}
	query += ` ORDER BY city ASC`

	rows, err := s.db.Query(queryCtx, query, values...)
	if err != nil {
		return nil, fmt.Errorf("cities: %w", err)
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("cities scan: %w", err)
		}
		result = append(result, value)
	}

	return result, nil
}

func (s *State) Supermarkets(ctx context.Context, city string) ([]string, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	query := `SELECT name FROM stores WHERE deleted_at IS NULL`
	values := []any{}
	if city != "" && city != "all" {
		values = append(values, city)
		query += ` AND city = $1`
	}
	query += ` ORDER BY name ASC`

	rows, err := s.db.Query(queryCtx, query, values...)
	if err != nil {
		return nil, fmt.Errorf("supermarkets: %w", err)
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("supermarkets scan: %w", err)
		}
		result = append(result, value)
	}

	return result, nil
}
