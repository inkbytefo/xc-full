package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// RateLimiterConfig holds rate limiter configuration.
type RateLimiterConfig struct {
	Redis       *redis.Client
	Max         int           // Maximum requests per window
	Window      time.Duration // Time window
	KeyPrefix   string        // Redis key prefix
	SkipPaths   []string      // Paths to skip rate limiting
}

// RateLimiter creates a Redis-based rate limiting middleware.
func RateLimiter(cfg RateLimiterConfig) fiber.Handler {
	if cfg.Max == 0 {
		cfg.Max = 100
	}
	if cfg.Window == 0 {
		cfg.Window = time.Minute
	}
	if cfg.KeyPrefix == "" {
		cfg.KeyPrefix = "ratelimit"
	}

	skipMap := make(map[string]bool)
	for _, path := range cfg.SkipPaths {
		skipMap[path] = true
	}

	return func(c *fiber.Ctx) error {
		// Skip rate limiting for specified paths
		if skipMap[c.Path()] {
			return c.Next()
		}

		// Get client identifier (IP or user ID)
		var key string
		if userID, ok := c.Locals("userID").(string); ok && userID != "" {
			key = fmt.Sprintf("%s:user:%s", cfg.KeyPrefix, userID)
		} else {
			key = fmt.Sprintf("%s:ip:%s", cfg.KeyPrefix, c.IP())
		}

		ctx := c.Context()

		// Increment counter
		count, err := cfg.Redis.Incr(ctx, key).Result()
		if err != nil {
			// If Redis fails, allow the request
			return c.Next()
		}

		// Set expiry on first request
		if count == 1 {
			cfg.Redis.Expire(ctx, key, cfg.Window)
		}

		// Get TTL for headers
		ttl, _ := cfg.Redis.TTL(ctx, key).Result()

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", fmt.Sprintf("%d", cfg.Max))
		c.Set("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, cfg.Max-int(count))))
		c.Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(ttl).Unix()))

		// Check if rate limit exceeded
		if int(count) > cfg.Max {
			c.Set("Retry-After", fmt.Sprintf("%d", int(ttl.Seconds())))
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests. Please try again later.",
				},
			})
		}

		return c.Next()
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
