package appstate

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Session struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	UserID       int64     `json:"userId"`
	Email        string    `json:"email"`
	CreatedAt    time.Time `json:"createdAt"`
	AccessKey    string    `json:"-"`
	RefreshKey   string    `json:"-"`
}

type storedSession struct {
	UserID     int64     `json:"userId"`
	Email      string    `json:"email"`
	CreatedAt  time.Time `json:"createdAt"`
	AccessKey  string    `json:"accessKey"`
	RefreshKey string    `json:"refreshKey"`
}

const (
	accessTokenTTL  = 12 * time.Hour
	refreshTokenTTL = 30 * 24 * time.Hour
)

func (s *State) CreateSession(ctx context.Context, userID int64, email string) (Session, error) {
	accessToken, err := randomToken(32)
	if err != nil {
		return Session{}, fmt.Errorf("create access token: %w", err)
	}
	refreshToken, err := randomToken(32)
	if err != nil {
		return Session{}, fmt.Errorf("create refresh token: %w", err)
	}

	session := Session{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       userID,
		Email:        email,
		CreatedAt:    time.Now().UTC(),
		AccessKey:    sessionAccessKey(accessToken),
		RefreshKey:   sessionRefreshKey(refreshToken),
	}
	payload, err := json.Marshal(storedSession{
		UserID:     session.UserID,
		Email:      session.Email,
		CreatedAt:  session.CreatedAt,
		AccessKey:  session.AccessKey,
		RefreshKey: session.RefreshKey,
	})
	if err != nil {
		return Session{}, fmt.Errorf("marshal session: %w", err)
	}

	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	if err = s.redis.Set(queryCtx, session.AccessKey, string(payload), accessTokenTTL).Err(); err != nil {
		return Session{}, fmt.Errorf("save access session: %w", err)
	}
	if err = s.redis.Set(queryCtx, session.RefreshKey, string(payload), refreshTokenTTL).Err(); err != nil {
		return Session{}, fmt.Errorf("save refresh session: %w", err)
	}

	return session, nil
}

func (s *State) SessionByAccessToken(ctx context.Context, accessToken string) (Session, bool, error) {
	return s.sessionByKey(ctx, sessionAccessKey(strings.TrimSpace(accessToken)))
}

func (s *State) SessionByRefreshToken(ctx context.Context, refreshToken string) (Session, bool, error) {
	return s.sessionByKey(ctx, sessionRefreshKey(strings.TrimSpace(refreshToken)))
}

func (s *State) DeleteSession(ctx context.Context, session Session) error {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	accessKey := session.AccessKey
	refreshKey := session.RefreshKey
	if accessKey == "" && strings.TrimSpace(session.AccessToken) != "" {
		accessKey = sessionAccessKey(session.AccessToken)
	}
	if refreshKey == "" && strings.TrimSpace(session.RefreshToken) != "" {
		refreshKey = sessionRefreshKey(session.RefreshToken)
	}
	return s.redis.Del(queryCtx, accessKey, refreshKey).Err()
}

func (s *State) RefreshSession(ctx context.Context, refreshToken string) (Session, bool, error) {
	current, found, err := s.SessionByRefreshToken(ctx, refreshToken)
	if err != nil || !found {
		return Session{}, found, err
	}
	if err = s.DeleteSession(ctx, current); err != nil {
		return Session{}, false, err
	}
	session, err := s.CreateSession(ctx, current.UserID, current.Email)
	if err != nil {
		return Session{}, false, err
	}
	return session, true, nil
}

func (s *State) sessionByKey(ctx context.Context, key string) (Session, bool, error) {
	queryCtx, cancel := withTimeout(ctx)
	defer cancel()

	raw, err := s.redis.Get(queryCtx, key).Result()
	if err != nil {
		if strings.Contains(err.Error(), "redis: nil") {
			return Session{}, false, nil
		}
		return Session{}, false, fmt.Errorf("load session: %w", err)
	}

	var stored storedSession
	if err = json.Unmarshal([]byte(raw), &stored); err != nil {
		return Session{}, false, fmt.Errorf("decode session: %w", err)
	}

	return Session{
		UserID:     stored.UserID,
		Email:      stored.Email,
		CreatedAt:  stored.CreatedAt,
		AccessKey:  stored.AccessKey,
		RefreshKey: stored.RefreshKey,
	}, true, nil
}

func sessionAccessKey(token string) string {
	return "session:access:" + tokenFingerprint(token)
}

func sessionRefreshKey(token string) string {
	return "session:refresh:" + tokenFingerprint(token)
}
