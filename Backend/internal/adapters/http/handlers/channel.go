package handlers

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	channelApp "xcord/internal/application/channel"
	"xcord/internal/domain/channel"
	"xcord/internal/domain/server"
)

// ChannelHandler handles channel-related requests.
type ChannelHandler struct {
	channelService *channelApp.Service
}

// NewChannelHandler creates a new ChannelHandler.
func NewChannelHandler(channelService *channelApp.Service) *ChannelHandler {
	return &ChannelHandler{channelService: channelService}
}

// List returns all channels in a server.
// GET /servers/:id/channels
func (h *ChannelHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	channels, err := h.channelService.ListByServer(c.Context(), serverID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	response := make([]dto.ChannelResponse, len(channels))
	for i, ch := range channels {
		response[i] = channelToDTO(ch)
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// Create creates a new channel.
// POST /servers/:id/channels
func (h *ChannelHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	var req dto.CreateChannelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if err := dto.Validate(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"VALIDATION_ERROR",
			err.Error(),
		))
	}

	// Default to text channel if type not specified
	channelType := req.Type
	if channelType == "" {
		channelType = "text"
	}

	ch, err := h.channelService.Create(c.Context(), channelApp.CreateCommand{
		ServerID:    serverID,
		Name:        req.Name,
		Description: req.Description,
		Type:        channel.ChannelType(channelType),
		ParentID:    req.ParentID,
		UserID:      userID,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": channelToDTO(ch),
	})
}

// Update updates a channel.
// PATCH /servers/:id/channels/:chId
func (h *ChannelHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")

	var req dto.UpdateChannelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	ch, err := h.channelService.Update(c.Context(), channelApp.UpdateCommand{
		ID:          channelID,
		ServerID:    serverID,
		Name:        req.Name,
		Description: req.Description,
		UserID:      userID,
		Position:    req.Position,
		ParentID:    req.ParentID,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": channelToDTO(ch),
	})
}

// Delete deletes a channel.
// DELETE /servers/:id/channels/:chId
func (h *ChannelHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")

	if err := h.channelService.Delete(c.Context(), channelID, serverID, userID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// Reorder reorders channels.
// PATCH /servers/:id/channels/reorder
func (h *ChannelHandler) Reorder(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	var req dto.ReorderChannelsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if err := dto.Validate(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"VALIDATION_ERROR",
			err.Error(),
		))
	}

	updates := make([]channelApp.ChannelPositionUpdate, len(req.Updates))
	for i, u := range req.Updates {
		updates[i] = channelApp.ChannelPositionUpdate{
			ID:       u.ID,
			Position: u.Position,
			ParentID: u.ParentID,
		}
	}

	err := h.channelService.Reorder(c.Context(), channelApp.ReorderCommand{
		ServerID: serverID,
		UserID:   userID,
		Updates:  updates,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusOK)
}

type AckRequest struct {
	MessageID string `json:"message_id"`
}

// Ack handles message acknowledgment.
// POST /servers/:id/channels/:chId/ack
func (h *ChannelHandler) Ack(c *fiber.Ctx) error {
	channelID := c.Params("chId")
	userID := c.Locals("userID").(string)

	var req AckRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if req.MessageID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_REQUEST",
			"Message ID is required",
		))
	}

	if err := h.channelService.AckMessage(c.Context(), userID, channelID, req.MessageID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *ChannelHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, channel.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Channel not found",
		))

	case errors.Is(err, channel.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to perform this action",
		))

	case errors.Is(err, server.ErrNotMember):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"NOT_MEMBER",
			"Not a member of this server",
		))

	default:
		slog.Error("channel handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func channelToDTO(ch *channel.Channel) dto.ChannelResponse {
	return dto.ChannelResponse{
		ID:          ch.ID,
		ServerID:    ch.ServerID,
		Name:        ch.Name,
		Description: ch.Description,
		Type:        string(ch.Type),
		Position:    ch.Position,
		ParentID:    ch.ParentID,
		IsPrivate:   ch.IsPrivate,
		CreatedAt:   ch.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}
}
