package config

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv             string
	HTTPPort           string
	CORSAllowedOrigins []string
	AppEncryptionKey   string
	PostgresURL        string
	RedisAddr          string
	RedisPassword      string
	RedisDB            int
	MinIOEndpoint      string
	MinIOAccessKey     string
	MinIOSecretKey     string
	MinIOUseSSL        bool
	MinIOBuckets       []string
	SeedOnStart        bool
	SeedAdminEmail     string
	SeedAdminPassword  string
}

func Load() Config {
	loadDotEnv()

	return Config{
		AppEnv:             getEnv("APP_ENV", "development"),
		HTTPPort:           getEnv("HTTP_PORT", "8080"),
		CORSAllowedOrigins: splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")),
		AppEncryptionKey:   getEnv("APP_ENCRYPTION_KEY", "local-dev-encryption-key-change-me"),
		PostgresURL:        getEnv("POSTGRES_URL", "postgres://postgres:postgres@127.0.0.1:5432/smartshelf?sslmode=disable"),
		RedisAddr:          getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		RedisDB:            getEnvInt("REDIS_DB", 0),
		MinIOEndpoint:      getEnv("MINIO_ENDPOINT", "127.0.0.1:9000"),
		MinIOAccessKey:     getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey:     getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinIOUseSSL:        getEnvBool("MINIO_USE_SSL", false),
		MinIOBuckets:       splitCSV(getEnv("MINIO_BUCKETS", "smartshelf-firmware,smartshelf-logs,smartshelf-archive")),
		SeedOnStart:        getEnvBool("SEED_ON_START", true),
		SeedAdminEmail:     getEnv("SEED_ADMIN_EMAIL", "admin@smartshelf.ai"),
		SeedAdminPassword:  getEnv("SEED_ADMIN_PASSWORD", "ChangeMe123!"),
	}
}

func loadDotEnv() {
	workingDir, err := os.Getwd()
	if err != nil {
		_ = godotenv.Load()
		return
	}

	for dir := workingDir; dir != ""; dir = filepath.Dir(dir) {
		envPath := filepath.Join(dir, ".env")
		if _, statErr := os.Stat(envPath); statErr == nil {
			_ = godotenv.Load(envPath)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
	}

	_ = godotenv.Load()
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getEnvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}

	return result
}
