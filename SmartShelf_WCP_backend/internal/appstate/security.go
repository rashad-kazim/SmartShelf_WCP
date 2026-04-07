package appstate

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

const (
	authAttemptTTL         = 15 * time.Minute
	authAttemptMaxFailures = 8
	notificationStreamTTL  = 2 * time.Minute
)

type streamSession struct {
	UserID    int64     `json:"userId"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

func (s *State) TooManyLoginAttempts(ctx context.Context, email, clientIP string) (bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	count, err := s.redis.Get(queryCtx, authAttemptKey(email, clientIP)).Int()
	if err != nil && !strings.Contains(err.Error(), "redis: nil") {
		return false, fmt.Errorf("load auth attempts: %w", err)
	}

	return count >= authAttemptMaxFailures, nil
}

func (s *State) RegisterFailedLogin(ctx context.Context, email, clientIP string) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	key := authAttemptKey(email, clientIP)
	pipe := s.redis.TxPipeline()
	pipe.Incr(queryCtx, key)
	pipe.Expire(queryCtx, key, authAttemptTTL)
	_, err := pipe.Exec(queryCtx)
	if err != nil {
		return fmt.Errorf("save auth attempt: %w", err)
	}

	return nil
}

func (s *State) ResetLoginAttempts(ctx context.Context, email, clientIP string) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	if err := s.redis.Del(queryCtx, authAttemptKey(email, clientIP)).Err(); err != nil {
		return fmt.Errorf("reset auth attempts: %w", err)
	}

	return nil
}

func (s *State) CreateNotificationStreamToken(ctx context.Context, userID int64, email string) (string, error) {
	token, err := randomToken(24)
	if err != nil {
		return "", fmt.Errorf("create stream token: %w", err)
	}

	payload, err := json.Marshal(streamSession{
		UserID:    userID,
		Email:     email,
		CreatedAt: time.Now().UTC(),
	})
	if err != nil {
		return "", fmt.Errorf("marshal stream token: %w", err)
	}

	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	if err = s.redis.Set(queryCtx, notificationStreamKey(token), payload, notificationStreamTTL).Err(); err != nil {
		return "", fmt.Errorf("save stream token: %w", err)
	}

	return token, nil
}

func (s *State) SessionByNotificationStreamToken(ctx context.Context, token string) (Session, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	raw, err := s.redis.Get(queryCtx, notificationStreamKey(token)).Result()
	if err != nil {
		if strings.Contains(err.Error(), "redis: nil") {
			return Session{}, false, nil
		}
		return Session{}, false, fmt.Errorf("load stream token: %w", err)
	}

	var stored streamSession
	if err = json.Unmarshal([]byte(raw), &stored); err != nil {
		return Session{}, false, fmt.Errorf("decode stream token: %w", err)
	}

	return Session{
		UserID:    stored.UserID,
		Email:     stored.Email,
		CreatedAt: stored.CreatedAt,
	}, true, nil
}

func authAttemptKey(email, clientIP string) string {
	return "auth:attempts:" + tokenFingerprint(strings.ToLower(strings.TrimSpace(email))+"|"+strings.TrimSpace(clientIP))
}

func notificationStreamKey(token string) string {
	return "notifications:stream:" + tokenFingerprint(token)
}
