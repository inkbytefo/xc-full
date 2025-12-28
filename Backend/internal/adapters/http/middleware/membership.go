// Package middleware provides HTTP middleware for the application.
package middleware

import (
	"github.com/gofiber/fiber/v2"

	"pink/internal/adapters/http/dto"
	"pink/internal/domain/server"
)

// RequireServerMembership creates a middleware that checks if the authenticated user
// is a member of the server specified in the route parameter.
// The middleware sets "member" in c.Locals for downstream handlers.
func RequireServerMembership(memberRepo server.MemberRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
				"UNAUTHORIZED",
				"Authentication required",
			))
		}

		serverID := c.Params("id")
		if serverID == "" {
			// Try alternative param names
			serverID = c.Params("serverId")
		}
		if serverID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
				"BAD_REQUEST",
				"Server ID is required",
			))
		}

		member, err := memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
		if err != nil || member == nil {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"FORBIDDEN",
				"Not a member of this server",
			))
		}

		// Set member in context for downstream handlers
		c.Locals("member", member)
		c.Locals("serverMember", member)

		return c.Next()
	}
}

// RequireServerMembershipWithRoles is similar to RequireServerMembership but also
// loads the member's roles for permission checking.
func RequireServerMembershipWithRoles(memberRepo server.MemberRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
				"UNAUTHORIZED",
				"Authentication required",
			))
		}

		serverID := c.Params("id")
		if serverID == "" {
			serverID = c.Params("serverId")
		}
		if serverID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
				"BAD_REQUEST",
				"Server ID is required",
			))
		}

		member, err := memberRepo.FindByServerAndUserWithRoles(c.Context(), serverID, userID)
		if err != nil || member == nil {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"FORBIDDEN",
				"Not a member of this server",
			))
		}

		// Set member in context for downstream handlers - includes roles for permission checks
		c.Locals("member", member)
		c.Locals("serverMember", member)

		return c.Next()
	}
}

// RequirePermission creates a middleware that checks if the authenticated member
// has the specified permission. Must be used after RequireServerMembershipWithRoles.
func RequirePermission(permission server.Permission) fiber.Handler {
	return func(c *fiber.Ctx) error {
		member, ok := c.Locals("member").(*server.Member)
		if !ok || member == nil {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"FORBIDDEN",
				"Membership verification required",
			))
		}

		if !member.HasPermission(permission) {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"FORBIDDEN",
				"You don't have permission to perform this action",
			))
		}

		return c.Next()
	}
}
