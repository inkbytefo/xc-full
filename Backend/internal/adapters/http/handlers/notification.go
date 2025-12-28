package handlers

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"pink/internal/adapters/http/dto"
	"pink/internal/domain/notification"
)

// NotificationHandler handles notification requests.
type NotificationHandler struct {
	notifRepo notification.Repository
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(notifRepo notification.Repository) *NotificationHandler {
	return &NotificationHandler{
		notifRepo: notifRepo,
	}
}

// GetNotifications returns notifications for the current user.
// GET /notifications
func (h *NotificationHandler) GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	notifications, nextCursor, err := h.notifRepo.FindByUserID(c.Context(), userID, cursor, limit)
	if err != nil {
		slog.Error("get notifications error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get notifications",
		))
	}

	response := make([]dto.NotificationResponse, len(notifications))
	for i, notif := range notifications {
		response[i] = notificationToDTO(notif)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

// GetUnreadCount returns the unread notification count.
// GET /notifications/unread/count
func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	count, err := h.notifRepo.GetUnreadCount(c.Context(), userID)
	if err != nil {
		slog.Error("get unread count error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get unread count",
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"unreadCount": count,
		},
	})
}

// MarkAsRead marks a notification as read.
// PATCH /notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	notif, err := h.notifRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	if notif.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not your notification",
		))
	}

	if err := h.notifRepo.MarkAsRead(c.Context(), id); err != nil {
		slog.Error("mark as read error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to mark as read",
		))
	}

	return c.JSON(fiber.Map{"message": "Marked as read"})
}

// MarkAllAsRead marks all notifications as read.
// POST /notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	if err := h.notifRepo.MarkAllAsRead(c.Context(), userID); err != nil {
		slog.Error("mark all as read error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to mark all as read",
		))
	}

	return c.JSON(fiber.Map{"message": "All notifications marked as read"})
}

// DeleteNotification deletes a notification.
// DELETE /notifications/:id
func (h *NotificationHandler) DeleteNotification(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	notif, err := h.notifRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	if notif.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not your notification",
		))
	}

	if err := h.notifRepo.Delete(c.Context(), id); err != nil {
		slog.Error("delete notification error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to delete notification",
		))
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *NotificationHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, notification.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Notification not found",
		))
	default:
		slog.Error("notification handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func notificationToDTO(notif *notification.Notification) dto.NotificationResponse {
	resp := dto.NotificationResponse{
		ID:         notif.ID,
		Type:       string(notif.Type),
		TargetType: notif.TargetType,
		TargetID:   notif.TargetID,
		Message:    notif.Message,
		IsRead:     notif.IsRead,
		CreatedAt:  notif.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if notif.Actor != nil {
		resp.Actor = &dto.NotificationActorResponse{
			ID:             notif.Actor.ID,
			Handle:         notif.Actor.Handle,
			DisplayName:    notif.Actor.DisplayName,
			AvatarGradient: notif.Actor.AvatarGradient,
		}
	}

	return resp
}
