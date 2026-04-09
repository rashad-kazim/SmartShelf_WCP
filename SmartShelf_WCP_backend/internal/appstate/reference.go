package appstate

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	restCountriesURL = "https://restcountries.com/v3.1/all?fields=name,cca2"
	countriesNowURL  = "https://countriesnow.space/api/v0.1/countries/cities"
)

var referenceHTTPClient = &http.Client{Timeout: 10 * time.Second}

var referenceCache = struct {
	mu             sync.RWMutex
	countries      []CountryOption
	countriesByKey map[string]CountryOption
	countriesAt    time.Time
	citiesByKey    map[string]cachedCities
}{
	countriesByKey: map[string]CountryOption{},
	citiesByKey:    map[string]cachedCities{},
}

type cachedCities struct {
	items     []string
	fetchedAt time.Time
}

type restCountriesItem struct {
	CCA2 string `json:"cca2"`
	Name struct {
		Common string `json:"common"`
	} `json:"name"`
}

type countriesNowRequest struct {
	Country string `json:"country"`
}

type countriesNowResponse struct {
	Error bool     `json:"error"`
	Msg   string   `json:"msg"`
	Data  []string `json:"data"`
}

func (s *State) Countries(ctx context.Context, source string) ([]CountryOption, error) {
	if source == "" || source == "all" {
		return fetchReferenceCountries(ctx)
	}

	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	query, args := referenceCountryQuery(source)
	rows, err := s.db.Query(queryCtx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("countries: %w", err)
	}
	defer rows.Close()

	catalog, err := fetchReferenceCountries(ctx)
	if err != nil {
		return nil, err
	}
	byName := buildCountryLookup(catalog)
	result := make([]CountryOption, 0)
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("countries scan: %w", err)
		}
		result = append(result, resolveCountryOption(byName, value))
	}

	sort.Slice(result, func(i, j int) bool {
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})

	return result, nil
}

func (s *State) Cities(ctx context.Context, source, country string) ([]string, error) {
	if source == "" || source == "all" {
		if strings.TrimSpace(country) == "" || country == "all" {
			return []string{}, nil
		}
		return fetchReferenceCities(ctx, country)
	}

	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	query, values := referenceCityQuery(source, country)

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

func referenceCountryQuery(source string) (string, []any) {
	switch source {
	case "company-users":
		return `SELECT DISTINCT country FROM users WHERE kind = 'company' AND deleted_at IS NULL ORDER BY country ASC`, nil
	case "supermarket-users":
		return `SELECT DISTINCT country FROM users WHERE kind = 'supermarket' AND deleted_at IS NULL ORDER BY country ASC`, nil
	default:
		return `SELECT DISTINCT country FROM stores WHERE deleted_at IS NULL ORDER BY country ASC`, nil
	}
}

func referenceCityQuery(source, country string) (string, []any) {
	var query string
	values := make([]any, 0, 1)

	switch source {
	case "company-users":
		query = `SELECT DISTINCT city FROM users WHERE kind = 'company' AND deleted_at IS NULL`
	case "supermarket-users":
		query = `SELECT DISTINCT city FROM users WHERE kind = 'supermarket' AND deleted_at IS NULL`
	default:
		query = `SELECT DISTINCT city FROM stores WHERE deleted_at IS NULL`
	}

	if country != "" && country != "all" {
		values = append(values, country)
		query += ` AND country = $1`
	}
	query += ` ORDER BY city ASC`

	return query, values
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

func fetchReferenceCountries(ctx context.Context) ([]CountryOption, error) {
	referenceCache.mu.RLock()
	if time.Since(referenceCache.countriesAt) < 24*time.Hour && len(referenceCache.countries) > 0 {
		items := append([]CountryOption(nil), referenceCache.countries...)
		referenceCache.mu.RUnlock()
		return items, nil
	}
	referenceCache.mu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, restCountriesURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build countries request: %w", err)
	}

	resp, err := referenceHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch countries: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("fetch countries status: %d", resp.StatusCode)
	}

	var payload []restCountriesItem
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode countries: %w", err)
	}

	result := make([]CountryOption, 0, len(payload))
	lookup := make(map[string]CountryOption, len(payload))
	for _, item := range payload {
		name := strings.TrimSpace(item.Name.Common)
		code := strings.ToUpper(strings.TrimSpace(item.CCA2))
		if name == "" || code == "" {
			continue
		}
		option := CountryOption{Name: name, Code: code}
		result = append(result, option)
		lookup[normalizeCountryKey(name)] = option
		if code == "GB" {
			lookup["uk"] = option
			lookup["united kingdom"] = option
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})

	referenceCache.mu.Lock()
	referenceCache.countries = append([]CountryOption(nil), result...)
	referenceCache.countriesByKey = lookup
	referenceCache.countriesAt = time.Now().UTC()
	referenceCache.mu.Unlock()

	return result, nil
}

func fetchReferenceCities(ctx context.Context, country string) ([]string, error) {
	key := normalizeCountryKey(country)

	referenceCache.mu.RLock()
	if cached, ok := referenceCache.citiesByKey[key]; ok && time.Since(cached.fetchedAt) < 24*time.Hour {
		items := append([]string(nil), cached.items...)
		referenceCache.mu.RUnlock()
		return items, nil
	}
	referenceCache.mu.RUnlock()

	countries, err := fetchReferenceCountries(ctx)
	if err != nil {
		return nil, err
	}
	lookup := buildCountryLookup(countries)
	canonicalCountry := resolveCountryOption(lookup, country).Name

	body, err := json.Marshal(countriesNowRequest{Country: canonicalCountry})
	if err != nil {
		return nil, fmt.Errorf("marshal cities request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, countriesNowURL, strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("build cities request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := referenceHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch cities: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("fetch cities status: %d", resp.StatusCode)
	}

	var payload countriesNowResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode cities: %w", err)
	}
	if payload.Error {
		return nil, fmt.Errorf("fetch cities response: %s", payload.Msg)
	}

	items := append([]string(nil), payload.Data...)
	sort.Slice(items, func(i, j int) bool {
		return strings.ToLower(items[i]) < strings.ToLower(items[j])
	})

	referenceCache.mu.Lock()
	referenceCache.citiesByKey[key] = cachedCities{
		items:     append([]string(nil), items...),
		fetchedAt: time.Now().UTC(),
	}
	referenceCache.mu.Unlock()

	return items, nil
}

func normalizeCountryKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func buildCountryLookup(items []CountryOption) map[string]CountryOption {
	lookup := make(map[string]CountryOption, len(items))
	for _, item := range items {
		lookup[normalizeCountryKey(item.Name)] = item
		if item.Code == "GB" {
			lookup["uk"] = item
			lookup["united kingdom"] = item
		}
	}
	return lookup
}

func resolveCountryOption(lookup map[string]CountryOption, value string) CountryOption {
	if option, ok := lookup[normalizeCountryKey(value)]; ok {
		return option
	}
	return CountryOption{Name: value, Code: ""}
}
