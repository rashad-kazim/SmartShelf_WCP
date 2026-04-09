package appstate

import (
	"context"
	"fmt"
)

func (s *State) purgeExpiredDeviceLogs(ctx context.Context) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	if _, err := s.db.Exec(queryCtx, `DELETE FROM device_logs WHERE logged_at < NOW() - INTERVAL '30 days'`); err != nil {
		return fmt.Errorf("purge expired device logs: %w", err)
	}

	return nil
}
