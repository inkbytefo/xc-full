package handlers

import (
	"errors"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/domain/channel"
	"xcord/internal/domain/server"
	"xcord/internal/domain/ws"
)

// ChannelMessageHandler handles channel message requests.
type ChannelMessageHandler struct {
	messageRepo      channel.MessageRepository
	channelRepo      channel.Repository
	memberRepo       server.MemberRepository
	serverRepo       server.Repository
	websocketHandler *WebSocketHandler
}

// NewChannelMessageHandler creates a new ChannelMessageHandler.
func NewChannelMessageHandler(
	messageRepo channel.MessageRepository,
	channelRepo channel.Repository,
	memberRepo server.MemberRepository,
	serverRepo server.Repository,
	websocketHandler *WebSocketHandler,
) *ChannelMessageHandler {
	return &ChannelMessageHandler{
		messageRepo:      messageRepo,
		channelRepo:      channelRepo,
		memberRepo:       memberRepo,
		serverRepo:       serverRepo,
		websocketHandler: websocketHandler,
	}
}

// GetMessages returns messages in a channel.
// GET /servers/:id/channels/:chId/messages
func (h *ChannelMessageHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	// Check membership
	member, err := h.memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
	if err != nil || member == nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a member of this server",
		))
	}

	// Verify channel exists
	ch, err := h.channelRepo.FindByID(c.Context(), channelID)
	if err != nil || ch == nil || ch.ServerID != serverID {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Channel not found",
		))
	}

	messages, nextCursor, err := h.messageRepo.FindByChannelID(c.Context(), channelID, cursor, limit)
	if err != nil {
		slog.Error("get channel messages error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get messages",
		))
	}

	response := make([]dto.ChannelMessageResponse, len(messages))
	for i, msg := range messages {
		response[i] = channelMessageToDTO(msg)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

// SendMessage sends a message to a channel.
// POST /servers/:id/channels/:chId/messages
func (h *ChannelMessageHandler) SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")

	// Check membership
	member, err := h.memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
	if err != nil || member == nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a member of this server",
		))
	}

	// Verify channel exists
	ch, err := h.channelRepo.FindByID(c.Context(), channelID)
	if err != nil || ch == nil || ch.ServerID != serverID {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Channel not found",
		))
	}

	var req dto.SendChannelMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if len(req.Content) == 0 || len(req.Content) > 2000 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Message content must be between 1 and 2000 characters",
		))
	}

	now := time.Now()
	msg := &channel.ChannelMessage{
		ID:        generateMsgID(),
		ChannelID: channelID,
		ServerID:  serverID,
		AuthorID:  userID,
		Content:   req.Content,
		IsEdited:  false,
		IsPinned:  false,
		ReplyToID: req.ReplyToID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := h.messageRepo.Create(c.Context(), msg); err != nil {
		slog.Error("create channel message error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to send message",
		))
	}

	if h.websocketHandler != nil {
		h.websocketHandler.BroadcastChannelMessage(serverID, channelID, ws.EventChannelMessage, channelMessageToDTO(msg))
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": channelMessageToDTO(msg),
	})
}

// EditMessage edits a message.
// PATCH /servers/:id/channels/:chId/messages/:msgId
func (h *ChannelMessageHandler) EditMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")
	messageID := c.Params("msgId")

	member, err := h.memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
	if err != nil || member == nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a member of this server",
		))
	}

	msg, err := h.messageRepo.FindByID(c.Context(), messageID)
	if err != nil {
		return h.handleError(c, err)
	}

	if msg.ServerID != serverID || msg.ChannelID != channelID {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Message not found",
		))
	}

	if msg.AuthorID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Cannot edit another user's message",
		))
	}

	var req dto.EditChannelMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if len(req.Content) == 0 || len(req.Content) > 2000 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Message content must be between 1 and 2000 characters",
		))
	}

	msg.Content = req.Content
	msg.IsEdited = true

	if err := h.messageRepo.Update(c.Context(), msg); err != nil {
		slog.Error("update channel message error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to edit message",
		))
	}

	if h.websocketHandler != nil {
		h.websocketHandler.BroadcastChannelMessage(serverID, channelID, ws.EventChannelMessageEdited, channelMessageToDTO(msg))
	}

	return c.JSON(fiber.Map{
		"data": channelMessageToDTO(msg),
	})
}

// DeleteMessage deletes a message.
// DELETE /servers/:id/channels/:chId/messages/:msgId
func (h *ChannelMessageHandler) DeleteMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")
	messageID := c.Params("msgId")

	member, err := h.memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
	if err != nil || member == nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a member of this server",
		))
	}

	msg, err := h.messageRepo.FindByID(c.Context(), messageID)
	if err != nil {
		return h.handleError(c, err)
	}

	if msg.ServerID != serverID || msg.ChannelID != channelID {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Message not found",
		))
	}

	// Check if user is author or has manage messages permission
	if msg.AuthorID != userID {
		if !h.canManageMessages(c, serverID, userID) {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"FORBIDDEN",
				"Cannot delete another user's message",
			))
		}
	}

	if err := h.messageRepo.Delete(c.Context(), messageID); err != nil {
		slog.Error("delete channel message error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to delete message",
		))
	}

	if h.websocketHandler != nil {
		h.websocketHandler.BroadcastChannelMessage(serverID, channelID, ws.EventChannelMessageDeleted, fiber.Map{"id": messageID})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// SearchMessages searches messages in a channel.
// GET /servers/:id/channels/:chId/messages/search
func (h *ChannelMessageHandler) SearchMessages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")
	channelID := c.Params("chId")
	query := c.Query("q")
	limit := c.QueryInt("limit", 20)

	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Search query is required",
		))
	}

	// Check membership
	member, err := h.memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
	if err != nil || member == nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a member of this server",
		))
	}

	messages, err := h.messageRepo.Search(c.Context(), channelID, query, limit)
	if err != nil {
		slog.Error("search channel messages error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to search messages",
		))
	}

	response := make([]dto.ChannelMessageResponse, len(messages))
	for i, msg := range messages {
		response[i] = channelMessageToDTO(msg)
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// canManageMessages checks if user can manage messages (delete others' messages)
func (h *ChannelMessageHandler) canManageMessages(c *fiber.Ctx, serverID, userID string) bool {
	// Check if owner
	srv, err := h.serverRepo.FindByID(c.Context(), serverID)
	if err == nil && srv.OwnerID == userID {
		return true
	}

	// Check role permissions
	member, err := h.memberRepo.FindByServerAndUserWithRoles(c.Context(), serverID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageMessages)
}

func (h *ChannelMessageHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, channel.ErrMessageNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Message not found",
		))
	default:
		slog.Error("channel message handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func channelMessageToDTO(msg *channel.ChannelMessage) dto.ChannelMessageResponse {
	resp := dto.ChannelMessageResponse{
		ID:        msg.ID,
		ChannelID: msg.ChannelID,
		ServerID:  msg.ServerID,
		AuthorID:  msg.AuthorID,
		Content:   msg.Content,
		IsEdited:  msg.IsEdited,
		IsPinned:  msg.IsPinned,
		ReplyToID: msg.ReplyToID,
		CreatedAt: msg.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if msg.Author != nil {
		resp.Author = &dto.ChannelMessageAuthorResponse{
			ID:             msg.Author.ID,
			Handle:         msg.Author.Handle,
			DisplayName:    msg.Author.DisplayName,
			AvatarGradient: msg.Author.AvatarGradient,
		}
	}

	return resp
}

func generateMsgID() string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	return "cmsg_" + clean[:21]
}
