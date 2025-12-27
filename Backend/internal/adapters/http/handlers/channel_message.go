package handlers

import (
	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/adapters/http/middleware"
	channelApp "xcord/internal/application/channel"
	"xcord/internal/domain/channel"
	"xcord/internal/domain/ws"
)

// ChannelMessageHandler handles channel message requests.
type ChannelMessageHandler struct {
	messageService   *channelApp.MessageService
	websocketHandler *WebSocketHandler
}

// NewChannelMessageHandler creates a new ChannelMessageHandler.
func NewChannelMessageHandler(
	messageService *channelApp.MessageService,
	websocketHandler *WebSocketHandler,
) *ChannelMessageHandler {
	return &ChannelMessageHandler{
		messageService:   messageService,
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

	messages, nextCursor, err := h.messageService.GetMessages(c.Context(), channelApp.GetMessagesCommand{
		ServerID:  serverID,
		ChannelID: channelID,
		UserID:    userID,
		Cursor:    cursor,
		Limit:     limit,
	})
	if err != nil {
		return h.handleError(c, err)
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

	var req dto.SendChannelMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	msg, err := h.messageService.SendMessage(c.Context(), channelApp.SendMessageCommand{
		ServerID:  serverID,
		ChannelID: channelID,
		UserID:    userID,
		Content:   req.Content,
		ReplyToID: req.ReplyToID,
	})
	if err != nil {
		return h.handleError(c, err)
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

	var req dto.EditChannelMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	msg, err := h.messageService.EditMessage(c.Context(), serverID, channelID, messageID, userID, req.Content)
	if err != nil {
		return h.handleError(c, err)
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

	if err := h.messageService.DeleteMessage(c.Context(), serverID, channelID, messageID, userID); err != nil {
		return h.handleError(c, err)
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

	messages, err := h.messageService.SearchMessages(c.Context(), serverID, channelID, userID, query, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	response := make([]dto.ChannelMessageResponse, len(messages))
	for i, msg := range messages {
		response[i] = channelMessageToDTO(msg)
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

func (h *ChannelMessageHandler) handleError(c *fiber.Ctx, err error) error {
	return middleware.HandleDomainError(c, err)
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
