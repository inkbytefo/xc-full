// Package middleware provides HTTP middleware for the application.
package middleware

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/domain/channel"
	"xcord/internal/domain/dm"
	"xcord/internal/domain/post"
	"xcord/internal/domain/server"
	"xcord/internal/domain/user"
)

// HandleDomainError maps domain errors to HTTP responses.
// Use this function to centralize error handling across all handlers.
func HandleDomainError(c *fiber.Ctx, err error) error {
	// Server domain errors
	switch {
	case errors.Is(err, server.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Server not found",
		))
	case errors.Is(err, server.ErrNotMember):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a member of this server",
		))
	case errors.Is(err, server.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to perform this action",
		))
	case errors.Is(err, server.ErrAlreadyMember):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"ALREADY_MEMBER",
			"Already a member of this server",
		))
	case errors.Is(err, server.ErrOwnerCannotLeave):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"OWNER_CANNOT_LEAVE",
			"Server owner cannot leave the server",
		))
	case errors.Is(err, server.ErrRoleNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Role not found",
		))

	// Channel domain errors
	case errors.Is(err, channel.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Channel not found",
		))
	case errors.Is(err, channel.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to access channel",
		))
	case errors.Is(err, channel.ErrMessageNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Message not found",
		))
	case errors.Is(err, channel.ErrInvalidContent):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Message content must be between 1 and 2000 characters",
		))
	case errors.Is(err, channel.ErrInvalidType):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_TYPE",
			"Invalid channel type",
		))
	case errors.Is(err, channel.ErrChannelFull):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"CHANNEL_FULL",
			"Channel is full",
		))

	// User domain errors
	case errors.Is(err, user.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"User not found",
		))
	case errors.Is(err, user.ErrEmailAlreadyExists):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"EMAIL_EXISTS",
			"Email already in use",
		))
	case errors.Is(err, user.ErrHandleAlreadyExists):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"HANDLE_EXISTS",
			"Handle already in use",
		))
	case errors.Is(err, user.ErrInvalidPassword):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"INVALID_CREDENTIALS",
			"Invalid email or password",
		))
	case errors.Is(err, user.ErrUnauthorized):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Account is inactive or unauthorized",
		))
	case errors.Is(err, user.ErrSessionExpired):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"SESSION_EXPIRED",
			"Your session has expired, please login again",
		))

	// DM domain errors
	case errors.Is(err, dm.ErrConversationNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Conversation not found",
		))
	case errors.Is(err, dm.ErrNotParticipant):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a participant in this conversation",
		))
	case errors.Is(err, dm.ErrCannotMessageSelf):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"CANNOT_MESSAGE_SELF",
			"Cannot start a conversation with yourself",
		))
	case errors.Is(err, dm.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to perform this action",
		))
	case errors.Is(err, dm.ErrInvalidContent):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Invalid message content",
		))

	// Post/Feed domain errors
	case errors.Is(err, post.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Post not found",
		))
	case errors.Is(err, post.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to modify this post",
		))
	case errors.Is(err, post.ErrInvalidContent):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Invalid post content",
		))

	// Default: internal server error
	default:
		slog.Error("unhandled domain error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}
