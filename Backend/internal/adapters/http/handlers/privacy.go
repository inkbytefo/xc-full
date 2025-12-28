// Package handlers provides HTTP request handlers.
package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pink/internal/adapters/http/dto"
	"pink/internal/application/privacy"
	domainPrivacy "pink/internal/domain/privacy"
)

// PrivacyHandler handles privacy-related requests.
type PrivacyHandler struct {
	privacyService *privacy.Service
}

// NewPrivacyHandler creates a new PrivacyHandler.
func NewPrivacyHandler(privacyService *privacy.Service) *PrivacyHandler {
	return &PrivacyHandler{
		privacyService: privacyService,
	}
}

// GetSettings returns the current user's privacy settings.
// GET /me/privacy
func (h *PrivacyHandler) GetSettings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	settings, err := h.privacyService.GetSettings(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fiber.Map{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to get privacy settings",
			},
		})
	}

	return c.JSON(fiber.Map{
		"data": dto.PrivacySettingsResponse{
			OnlineStatusVisibility:  string(settings.OnlineStatusVisibility),
			DMPermission:            string(settings.DMPermission),
			ProfileVisibility:       string(settings.ProfileVisibility),
			ShowActivity:            settings.ShowActivity,
			ReadReceiptsEnabled:     settings.ReadReceiptsEnabled,
			TypingIndicatorsEnabled: settings.TypingIndicatorsEnabled,
			FriendRequestPermission: string(settings.FriendRequestPermission),
			ShowServerTags:          settings.ShowServerTags,
		},
	})
}

// UpdateSettings updates the current user's privacy settings.
// PATCH /me/privacy
func (h *PrivacyHandler) UpdateSettings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req dto.UpdatePrivacyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fiber.Map{
				"code":    "BAD_REQUEST",
				"message": "Invalid request body",
			},
		})
	}

	cmd := privacy.UpdateCommand{
		OnlineStatusVisibility:  req.OnlineStatusVisibility,
		DMPermission:            req.DMPermission,
		ProfileVisibility:       req.ProfileVisibility,
		ShowActivity:            req.ShowActivity,
		ReadReceiptsEnabled:     req.ReadReceiptsEnabled,
		TypingIndicatorsEnabled: req.TypingIndicatorsEnabled,
		FriendRequestPermission: req.FriendRequestPermission,
		ShowServerTags:          req.ShowServerTags,
	}

	settings, err := h.privacyService.UpdateSettings(c.Context(), userID, cmd)
	if err != nil {
		if err == domainPrivacy.ErrInvalidSetting {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "BAD_REQUEST",
					"message": "Invalid privacy setting value",
				},
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fiber.Map{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update privacy settings",
			},
		})
	}

	return c.JSON(fiber.Map{
		"data": dto.PrivacySettingsResponse{
			OnlineStatusVisibility:  string(settings.OnlineStatusVisibility),
			DMPermission:            string(settings.DMPermission),
			ProfileVisibility:       string(settings.ProfileVisibility),
			ShowActivity:            settings.ShowActivity,
			ReadReceiptsEnabled:     settings.ReadReceiptsEnabled,
			TypingIndicatorsEnabled: settings.TypingIndicatorsEnabled,
			FriendRequestPermission: string(settings.FriendRequestPermission),
			ShowServerTags:          settings.ShowServerTags,
		},
	})
}

// CheckDMPermission checks if a user can send DM to another user.
// GET /users/:id/can-dm
func (h *PrivacyHandler) CheckDMPermission(c *fiber.Ctx) error {
	viewerID := c.Locals("userID").(string)
	targetID := c.Params("id")

	canSend, err := h.privacyService.CanSendDM(c.Context(), viewerID, targetID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fiber.Map{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to check DM permission",
			},
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"canSendDM": canSend,
		},
	})
}
