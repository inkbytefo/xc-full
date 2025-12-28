package handlers

import (
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"pink/internal/adapters/http/dto"
	"pink/internal/domain/user"
)

// SettingsHandler handles user settings requests.
type SettingsHandler struct {
	userRepo user.Repository
}

// NewSettingsHandler creates a new SettingsHandler.
func NewSettingsHandler(userRepo user.Repository) *SettingsHandler {
	return &SettingsHandler{
		userRepo: userRepo,
	}
}

// NotificationSettings represents user notification preferences.
type NotificationSettings struct {
	LikesEnabled    bool `json:"likesEnabled"`
	CommentsEnabled bool `json:"commentsEnabled"`
	FollowsEnabled  bool `json:"followsEnabled"`
	MentionsEnabled bool `json:"mentionsEnabled"`
	DMEnabled       bool `json:"dmEnabled"`
	CallsEnabled    bool `json:"callsEnabled"`
	VoiceEnabled    bool `json:"voiceEnabled"`
	StreamEnabled   bool `json:"streamEnabled"`
}

// GetNotificationSettings returns the user's notification preferences.
// GET /me/settings/notifications
func (h *SettingsHandler) GetNotificationSettings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	u, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		slog.Error("get user error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get notification settings",
		))
	}

	// Return notification settings from user metadata or defaults
	settings := NotificationSettings{
		LikesEnabled:    getMetaBool(u, "notif_likes", true),
		CommentsEnabled: getMetaBool(u, "notif_comments", true),
		FollowsEnabled:  getMetaBool(u, "notif_follows", true),
		MentionsEnabled: getMetaBool(u, "notif_mentions", true),
		DMEnabled:       getMetaBool(u, "notif_dm", true),
		CallsEnabled:    getMetaBool(u, "notif_calls", true),
		VoiceEnabled:    getMetaBool(u, "notif_voice", true),
		StreamEnabled:   getMetaBool(u, "notif_stream", true),
	}

	return c.JSON(fiber.Map{"data": settings})
}

// UpdateNotificationSettings updates the user's notification preferences.
// PUT /me/settings/notifications
func (h *SettingsHandler) UpdateNotificationSettings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req NotificationSettings
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_REQUEST",
			"Invalid request body",
		))
	}

	u, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		slog.Error("get user error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to update notification settings",
		))
	}

	// Initialize metadata if nil
	if u.Metadata == nil {
		u.Metadata = make(map[string]interface{})
	}

	// Update metadata
	u.Metadata["notif_likes"] = req.LikesEnabled
	u.Metadata["notif_comments"] = req.CommentsEnabled
	u.Metadata["notif_follows"] = req.FollowsEnabled
	u.Metadata["notif_mentions"] = req.MentionsEnabled
	u.Metadata["notif_dm"] = req.DMEnabled
	u.Metadata["notif_calls"] = req.CallsEnabled
	u.Metadata["notif_voice"] = req.VoiceEnabled
	u.Metadata["notif_stream"] = req.StreamEnabled

	if err := h.userRepo.Update(c.Context(), u); err != nil {
		slog.Error("update user error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to update notification settings",
		))
	}

	return c.JSON(fiber.Map{"data": req})
}

// Helper to get boolean from user metadata with default
func getMetaBool(u *user.User, key string, defaultVal bool) bool {
	if u.Metadata == nil {
		return defaultVal
	}
	if val, ok := u.Metadata[key]; ok {
		if boolVal, ok := val.(bool); ok {
			return boolVal
		}
	}
	return defaultVal
}
