package appstate

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"smartshelf/wcp-backend/internal/config"
)

const encryptedPrefix = "enc:v1:"

type State struct {
	cfg   config.Config
	db    *pgxpool.Pool
	redis *redis.Client
	minio *minio.Client
}

func New(ctx context.Context, cfg config.Config) (*State, error) {
	db, err := pgxpool.New(ctx, cfg.PostgresURL)
	if err != nil {
		return nil, fmt.Errorf("postgres connect: %w", err)
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	minioClient, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("minio connect: %w", err)
	}

	state := &State{
		cfg:   cfg,
		db:    db,
		redis: redisClient,
		minio: minioClient,
	}

	if err := state.bootstrap(ctx); err != nil {
		state.Close()
		return nil, err
	}

	return state, nil
}

func (s *State) Close() {
	if s.db != nil {
		s.db.Close()
	}
	if s.redis != nil {
		_ = s.redis.Close()
	}
}

func (s *State) bootstrap(ctx context.Context) error {
	if err := s.pingDependencies(ctx); err != nil {
		return err
	}
	if err := s.runMigrations(ctx); err != nil {
		return err
	}
	if err := s.ensureBuckets(ctx); err != nil {
		return err
	}
	if err := s.purgeExpiredDeviceLogs(ctx); err != nil {
		return err
	}
	if s.cfg.SeedOnStart {
		if err := s.seedData(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (s *State) pingDependencies(ctx context.Context) error {
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := s.db.Ping(pingCtx); err != nil {
		return fmt.Errorf("postgres ping: %w", err)
	}
	if err := s.redis.Ping(pingCtx).Err(); err != nil {
		return fmt.Errorf("redis ping: %w", err)
	}

	return nil
}

func (s *State) ensureBuckets(ctx context.Context) error {
	for _, bucket := range s.cfg.MinIOBuckets {
		exists, err := s.minio.BucketExists(ctx, bucket)
		if err != nil {
			return fmt.Errorf("minio bucket check %s: %w", bucket, err)
		}
		if exists {
			continue
		}
		if err := s.minio.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("minio make bucket %s: %w", bucket, err)
		}
	}

	return nil
}

func withTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 5*time.Second)
}

func normalizePagination(page, limit int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	return page, limit
}

func offsetFromPage(page, limit int) int {
	return (page - 1) * limit
}

func marshalStringList(values []string) []byte {
	if len(values) == 0 {
		return []byte("[]")
	}
	payload, _ := json.Marshal(values)
	return payload
}

func unmarshalStringList(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	return values
}

func nullableStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func hashSecret(secret string) (string, error) {
	payload, err := bcrypt.GenerateFromPassword([]byte(secret), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func compareSecret(hashValue, plainText string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashValue), []byte(plainText)) == nil
}

func randomToken(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.TrimRight(base64.RawURLEncoding.EncodeToString(buf), "="), nil
}

func timeKeyFrom(timestamp time.Time) string {
	diff := time.Since(timestamp)
	switch {
	case diff < time.Minute:
		return "time_just_now"
	case diff < 10*time.Minute:
		return "time_5_minutes_ago"
	case diff < 30*time.Minute:
		return "time_10_minutes_ago"
	case diff < 3*time.Hour:
		return "time_2_hours_ago"
	default:
		return "time_yesterday"
	}
}

func dashboardRangeWindow(value DashboardRange) (time.Time, []string) {
	now := time.Now().UTC()
	if value == DashboardRange30d {
		return now.AddDate(0, 0, -29), []string{"W1", "W2", "W3", "W4"}
	}
	return now.AddDate(0, 0, -6), []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
}

func dashboardBucketLabel(value DashboardRange, timestamp time.Time) string {
	if value == DashboardRange30d {
		day := timestamp.UTC().Day()
		switch {
		case day <= 7:
			return "W1"
		case day <= 14:
			return "W2"
		case day <= 21:
			return "W3"
		default:
			return "W4"
		}
	}
	return timestamp.UTC().Format("Mon")
}

var errNotFound = errors.New("not_found")

func tokenFingerprint(token string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(token)))
	return hex.EncodeToString(sum[:])
}

func (s *State) encryptSecretValue(plainText string) string {
	if strings.TrimSpace(plainText) == "" {
		return ""
	}
	if strings.HasPrefix(plainText, encryptedPrefix) {
		return plainText
	}
	key := sha256.Sum256([]byte(s.cfg.AppEncryptionKey))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return plainText
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return plainText
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return plainText
	}
	cipherText := aead.Seal(nil, nonce, []byte(plainText), nil)
	return encryptedPrefix + base64.RawStdEncoding.EncodeToString(append(nonce, cipherText...))
}

func (s *State) decryptSecretValue(cipherText string) string {
	if !strings.HasPrefix(cipherText, encryptedPrefix) {
		return cipherText
	}
	payload, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(cipherText, encryptedPrefix))
	if err != nil {
		return cipherText
	}
	key := sha256.Sum256([]byte(s.cfg.AppEncryptionKey))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return cipherText
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return cipherText
	}
	if len(payload) < aead.NonceSize() {
		return cipherText
	}
	nonce := payload[:aead.NonceSize()]
	encrypted := payload[aead.NonceSize():]
	plainText, err := aead.Open(nil, nonce, encrypted, nil)
	if err != nil {
		return cipherText
	}
	return string(plainText)
}
