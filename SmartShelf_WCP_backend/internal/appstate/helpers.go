package appstate

import (
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func isNoRows(err error) bool {
	return err == pgx.ErrNoRows
}

func ErrNotFound() error {
	return errNotFound
}

func deriveReportIndex(timestamp time.Time) string {
	hour := timestamp.UTC().Hour()
	switch {
	case hour >= 16:
		return "Closing Logs"
	case hour >= 12:
		return "Middle Logs"
	default:
		return "Opening Logs"
	}
}

func matchesBatteryStatus(battery int, filter string) bool {
	switch strings.TrimSpace(filter) {
	case "", "all":
		return true
	case "<25":
		return battery < 25
	case "25-50":
		return battery >= 25 && battery <= 50
	case "50-75":
		return battery >= 50 && battery <= 75
	case "75-100":
		return battery >= 75 && battery <= 100
	default:
		return true
	}
}

func maskedToken(token string) string {
	if strings.TrimSpace(token) == "" {
		return "********"
	}
	return "********"
}

func zeroIfEmpty(value string) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return 0
	}
	return parsed
}
