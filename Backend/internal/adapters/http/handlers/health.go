package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// HealthHandler handles health check requests.
type HealthHandler struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(db *pgxpool.Pool, redis *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redis,
	}
}

// Health returns basic health status.
// GET /health
func (h *HealthHandler) Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
	})
}

// Ready returns detailed readiness status.
// GET /ready
func (h *HealthHandler) Ready(c *fiber.Ctx) error {
	ctx := c.Context()
	checks := make(map[string]interface{})
	allHealthy := true

	// Check PostgreSQL
	if err := h.db.Ping(ctx); err != nil {
		checks["postgresql"] = map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		}
		allHealthy = false
	} else {
		checks["postgresql"] = map[string]interface{}{
			"status": "ok",
		}
	}

	// Check Redis
	if h.redis != nil {
		if _, err := h.redis.Ping(ctx).Result(); err != nil {
			checks["redis"] = map[string]interface{}{
				"status": "error",
				"error":  err.Error(),
			}
			allHealthy = false
		} else {
			checks["redis"] = map[string]interface{}{
				"status": "ok",
			}
		}
	}

	status := "ok"
	httpStatus := fiber.StatusOK
	if !allHealthy {
		status = "degraded"
		httpStatus = fiber.StatusServiceUnavailable
	}

	return c.Status(httpStatus).JSON(fiber.Map{
		"status": status,
		"checks": checks,
	})
}
