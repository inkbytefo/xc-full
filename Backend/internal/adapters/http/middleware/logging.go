package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RequestLogger provides structured request logging.
func RequestLogger(logger *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Generate request ID
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("X-Request-ID", requestID)
		c.Locals("requestID", requestID)

		// Start timer
		start := time.Now()

		// Process request
		err := c.Next()

		// Log request
		duration := time.Since(start)
		status := c.Response().StatusCode()

		attrs := []any{
			slog.String("method", c.Method()),
			slog.String("path", c.Path()),
			slog.Int("status", status),
			slog.Duration("duration", duration),
			slog.String("request_id", requestID),
			slog.String("ip", c.IP()),
		}

		// Add user ID if present
		if userID, ok := c.Locals("userID").(string); ok {
			attrs = append(attrs, slog.String("user_id", userID))
		}

		// Log based on status
		if status >= 500 {
			logger.Error("HTTP request", attrs...)
		} else if status >= 400 {
			logger.Warn("HTTP request", attrs...)
		} else {
			logger.Info("HTTP request", attrs...)
		}

		return err
	}
}

// Recovery recovers from panics and logs them.
func Recovery(logger *slog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				requestID, _ := c.Locals("requestID").(string)

				logger.Error("panic recovered",
					slog.Any("panic", r),
					slog.String("request_id", requestID),
					slog.String("path", c.Path()),
					slog.String("method", c.Method()),
				)

				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fiber.Map{
						"code":    "INTERNAL_ERROR",
						"message": "An internal error occurred",
					},
				})
			}
		}()

		return c.Next()
	}
}
