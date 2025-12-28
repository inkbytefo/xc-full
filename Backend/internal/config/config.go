// Package config provides application configuration management.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	Env   string
	HTTP  HTTPConfig
	DB    DatabaseConfig
	Redis RedisConfig
	JWT   JWTConfig
	CORS  CORSConfig
	Log   LogConfig
}

// HTTPConfig holds HTTP server configuration.
type HTTPConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// DatabaseConfig holds database configuration.
type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// RedisConfig holds Redis configuration.
type RedisConfig struct {
	URL        string
	MaxRetries int
	PoolSize   int
}

// JWTConfig holds JWT authentication configuration.
type JWTConfig struct {
	PrivateKeyPath       string
	PublicKeyPath        string
	AccessTokenDuration  time.Duration
	RefreshTokenDuration time.Duration
}

// CORSConfig holds CORS configuration.
type CORSConfig struct {
	AllowedOrigins []string
}

// LogConfig holds logging configuration.
type LogConfig struct {
	Level  string
	Format string
}

// Load reads configuration from environment variables.
// In development mode, it loads from .env file.
func Load() (*Config, error) {
	// Load .env file in development
	if os.Getenv("ENV") != "production" {
		if err := godotenv.Load(); err != nil {
			// .env file is optional in production
			if os.Getenv("ENV") != "" {
				// Only warn, don't fail
				fmt.Println("Warning: .env file not found")
			}
		}
	}

	cfg := &Config{
		Env: getEnv("ENV", "development"),
		HTTP: HTTPConfig{
			Port:         getEnv("HTTP_PORT", "8080"),
			ReadTimeout:  getDuration("HTTP_READ_TIMEOUT", 10*time.Second),
			WriteTimeout: getDuration("HTTP_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:  getDuration("HTTP_IDLE_TIMEOUT", 120*time.Second),
		},
		DB: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", "postgres://pink:pink@localhost:5432/pink?sslmode=disable"),
			MaxOpenConns:    getInt("DATABASE_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getInt("DATABASE_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getDuration("DATABASE_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			URL:        getEnv("REDIS_URL", "redis://localhost:6379"),
			MaxRetries: getInt("REDIS_MAX_RETRIES", 3),
			PoolSize:   getInt("REDIS_POOL_SIZE", 10),
		},
		JWT: JWTConfig{
			PrivateKeyPath:       getEnv("JWT_PRIVATE_KEY_PATH", "./keys/jwt_private.pem"),
			PublicKeyPath:        getEnv("JWT_PUBLIC_KEY_PATH", "./keys/jwt_public.pem"),
			AccessTokenDuration:  getDuration("JWT_ACCESS_TOKEN_DURATION", 15*time.Minute),
			RefreshTokenDuration: getDuration("JWT_REFRESH_TOKEN_DURATION", 168*time.Hour),
		},
		CORS: CORSConfig{
			AllowedOrigins: getSlice("CORS_ALLOWED_ORIGINS", ","),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// Validate checks if required configuration values are present.
func (c *Config) Validate() error {
	if c.DB.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.Redis.URL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}
	return nil
}

// IsDevelopment returns true if running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

// IsProduction returns true if running in production mode.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if d, err := time.ParseDuration(value); err == nil {
			return d
		}
	}
	return defaultValue
}

func getSlice(key, separator string) []string {
	value := os.Getenv(key)
	if value == "" {
		return []string{}
	}
	parts := strings.Split(value, separator)
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
