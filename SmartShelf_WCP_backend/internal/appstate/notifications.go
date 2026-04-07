package appstate

import (
	"context"
	"fmt"
	"time"
)

func (s *State) Notifications(ctx context.Context, page, limit int, unreadOnly bool) ([]Notification, int, error) {
	page, limit = normalizePagination(page, limit)
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	conditions := ""
	values := []any{}
	if unreadOnly {
		conditions = ` WHERE is_read = false`
	}

	var total int
	if err := s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM notifications`+conditions, values...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("notifications count: %w", err)
	}

	values = append(values, limit, offsetFromPage(page, limit))
	query := `
		SELECT id, title_key, description_key, time_key, category, severity, event_type, entity_id,
			is_read, requires_ack, acknowledged_at, silenced_at, href, created_at
		FROM notifications` + conditions + `
		ORDER BY created_at DESC
		LIMIT $` + fmt.Sprintf("%d", len(values)-1) + ` OFFSET $` + fmt.Sprintf("%d", len(values))

	rows, err := s.db.Query(queryCtx, query, values...)
	if err != nil {
		return nil, 0, fmt.Errorf("notifications list: %w", err)
	}
	defer rows.Close()

	items := make([]Notification, 0)
	for rows.Next() {
		var item Notification
		if err := rows.Scan(
			&item.ID,
			&item.TitleKey,
			&item.DescriptionKey,
			&item.TimeKey,
			&item.Category,
			&item.Severity,
			&item.EventType,
			&item.EntityID,
			&item.IsRead,
			&item.RequiresAck,
			&item.AcknowledgedAt,
			&item.SilencedAt,
			&item.Href,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("notifications scan: %w", err)
		}
		item.TimeKey = timeKeyFrom(item.CreatedAt)
		items = append(items, item)
	}

	return items, total, nil
}

func (s *State) UnreadNotificationCount(ctx context.Context) (int, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	cacheKey := "notifications:unread_count"
	if cached, err := s.redis.Get(queryCtx, cacheKey).Int(); err == nil {
		return cached, nil
	}

	var count int
	if err := s.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM notifications WHERE is_read = false`).Scan(&count); err != nil {
		return 0, fmt.Errorf("notifications unread count: %w", err)
	}
	_ = s.redis.Set(queryCtx, cacheKey, count, 30*time.Second).Err()
	return count, nil
}

func (s *State) MarkNotificationRead(ctx context.Context, id string) (bool, error) {
	return s.touchNotification(ctx, id, `UPDATE notifications SET is_read = true WHERE id = $1`)
}

func (s *State) AcknowledgeNotification(ctx context.Context, id string) (bool, error) {
	return s.touchNotification(ctx, id, `UPDATE notifications SET is_read = true, acknowledged_at = NOW() WHERE id = $1`)
}

func (s *State) SilenceNotification(ctx context.Context, id string) (bool, error) {
	return s.touchNotification(ctx, id, `UPDATE notifications SET is_read = true, silenced_at = NOW() WHERE id = $1`)
}

func (s *State) MarkAllNotificationsRead(ctx context.Context) (int64, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	command, err := s.db.Exec(queryCtx, `UPDATE notifications SET is_read = true WHERE is_read = false`)
	if err != nil {
		return 0, fmt.Errorf("notifications read all: %w", err)
	}
	_ = s.redis.Del(queryCtx, "notifications:unread_count").Err()
	return command.RowsAffected(), nil
}

func (s *State) touchNotification(ctx context.Context, id, statement string) (bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	command, err := s.db.Exec(queryCtx, statement, id)
	if err != nil {
		return false, fmt.Errorf("notification update: %w", err)
	}
	_ = s.redis.Del(queryCtx, "notifications:unread_count").Err()
	return command.RowsAffected() > 0, nil
}
