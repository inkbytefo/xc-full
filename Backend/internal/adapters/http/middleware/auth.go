// Package middleware provides HTTP middleware functions.
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/application/user"
)

// AuthMiddleware provides JWT authentication middleware.
type AuthMiddleware struct {
	userService *user.Service
}

// NewAuthMiddleware creates a new AuthMiddleware.
func NewAuthMiddleware(userService *user.Service) *AuthMiddleware {
	return &AuthMiddleware{userService: userService}
}

// Authenticate validates the JWT and injects user ID into context.
func (m *AuthMiddleware) Authenticate() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try to get token from cookie first
		token := c.Cookies("access_token")

		// Fallback to Authorization header
		if token == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
					token = parts[1]
				}
			}
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
				"UNAUTHORIZED",
				"Missing authentication token",
			))
		}

		// Validate token
		userID, err := m.userService.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
				"UNAUTHORIZED",
				"Invalid or expired token",
			))
		}

		// Set user ID in context
		c.Locals("userID", userID)

		return c.Next()
	}
}

// OptionalAuth tries to authenticate but allows unauthenticated requests.
func (m *AuthMiddleware) OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try to get token from cookie first
		token := c.Cookies("access_token")

		// Fallback to Authorization header
		if token == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
					token = parts[1]
				}
			}
		}

		if token != "" {
			userID, err := m.userService.ValidateToken(token)
			if err == nil && userID != "" {
				c.Locals("userID", userID)
			}
		}

		return c.Next()
	}
}

// AuthenticateWS validates JWT for WebSocket connections.
// WebSocket connections send token via query parameter since browsers
// don't allow custom headers for WebSocket handshake.
func (m *AuthMiddleware) AuthenticateWS() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try to get token from cookie first (Browsers send cookies on WS upgrade)
		token := c.Cookies("access_token")

		// Fallback to query parameter
		if token == "" {
			token = c.Query("token")
		}

		// Fallback to Authorization header
		if token == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
					token = parts[1]
				}
			}
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
				"UNAUTHORIZED",
				"Missing authentication token",
			))
		}

		// Validate token
		userID, err := m.userService.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
				"UNAUTHORIZED",
				"Invalid or expired token",
			))
		}

		// Set user ID in context
		c.Locals("userID", userID)

		return c.Next()
	}
}
