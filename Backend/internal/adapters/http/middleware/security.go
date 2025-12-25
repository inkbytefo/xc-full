package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// SecurityHeaders adds security headers to responses.
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Prevent MIME type sniffing
		c.Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Set("X-Frame-Options", "DENY")

		// XSS protection
		c.Set("X-XSS-Protection", "1; mode=block")

		// Referrer policy
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy
		c.Set("Content-Security-Policy", "default-src 'self'")

		// Permissions Policy
		c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Strict Transport Security (HSTS)
		// Only enable in production with HTTPS
		// c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		return c.Next()
	}
}

// CORS creates a CORS middleware with the specified origins.
func CORS(allowedOrigins []string) fiber.Handler {
	originMap := make(map[string]bool)
	for _, origin := range allowedOrigins {
		originMap[origin] = true
	}

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// Check if origin is allowed
		if origin != "" && (len(allowedOrigins) == 0 || originMap[origin] || originMap["*"]) {
			c.Set("Access-Control-Allow-Origin", origin)
			c.Set("Access-Control-Allow-Credentials", "true")
			c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
			c.Set("Access-Control-Max-Age", "86400")
		}

		// Handle preflight requests
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}
