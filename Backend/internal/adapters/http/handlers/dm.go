package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	dmApp "xcord/internal/application/dm"
	"xcord/internal/domain/dm"
	"xcord/internal/domain/user"
	"xcord/internal/domain/ws"
	wsInfra "xcord/internal/infrastructure/ws"
)

// DMHandler handles DM-related requests.
type DMHandler struct {
	dmService *dmApp.Service
	hub       *wsInfra.Hub
	userRepo  user.Repository
}

// NewDMHandler creates a new DMHandler.
func NewDMHandler(dmService *dmApp.Service, hub *wsInfra.Hub, userRepo user.Repository) *DMHandler {
	return &DMHandler{
		dmService: dmService,
		hub:       hub,
		userRepo:  userRepo,
	}
}

// ListConversations returns all conversations for the user.
// GET /dm/conversations
func (h *DMHandler) ListConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	convs, err := h.dmService.GetConversations(c.Context(), userID)
	if err != nil {
		slog.Error("list conversations error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to list conversations",
		))
	}

	response := make([]dto.ConversationResponse, len(convs))
	for i, conv := range convs {
		response[i] = conversationToDTO(conv)
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// StartConversation starts a new conversation.
// POST /dm/conversations
func (h *DMHandler) StartConversation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req dto.StartConversationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	conv, err := h.dmService.StartConversation(c.Context(), userID, req.UserID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": conversationToDTO(conv),
	})
}

// GetConversation returns a conversation by ID.
// GET /dm/conversations/:id
func (h *DMHandler) GetConversation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	convID := c.Params("id")

	conv, err := h.dmService.GetConversation(c.Context(), convID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": conversationToDTO(conv),
	})
}

// GetMessages returns messages in a conversation.
// GET /dm/conversations/:id/messages
func (h *DMHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	convID := c.Params("id")
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	messages, nextCursor, err := h.dmService.GetMessages(c.Context(), convID, userID, cursor, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	response := make([]dto.DMMessageResponse, len(messages))
	for i, msg := range messages {
		response[i] = messageToDTO(msg)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

// SendMessage sends a message in a conversation.
// POST /dm/conversations/:id/messages
func (h *DMHandler) SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	convID := c.Params("id")

	var req dto.SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	msg, err := h.dmService.SendMessage(c.Context(), dmApp.SendMessageCommand{
		ConversationID: convID,
		SenderID:       userID,
		Content:        req.Content,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	// Broadcast new message to conversation subscribers
	go h.broadcastDMMessage(convID, ws.EventDMMessage, msg)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": messageToDTO(msg),
	})
}

// EditMessage edits a message.
// PATCH /dm/messages/:id
func (h *DMHandler) EditMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	messageID := c.Params("id")

	var req dto.EditMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	msg, err := h.dmService.EditMessage(c.Context(), messageID, userID, req.Content)
	if err != nil {
		return h.handleError(c, err)
	}

	// Broadcast edited message to conversation subscribers
	go h.broadcastDMMessage(msg.ConversationID, ws.EventDMMessageEdited, msg)

	return c.JSON(fiber.Map{
		"data": messageToDTO(msg),
	})
}

// DeleteMessage deletes a message.
// DELETE /dm/messages/:id
func (h *DMHandler) DeleteMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	messageID := c.Params("id")
	convID := c.Query("conversationId") // For broadcast

	if err := h.dmService.DeleteMessage(c.Context(), messageID, userID); err != nil {
		return h.handleError(c, err)
	}

	// Broadcast deleted message to conversation subscribers
	if convID != "" {
		go h.broadcastDMMessage(convID, ws.EventDMMessageDeleted, &dm.Message{ID: messageID, ConversationID: convID})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// MarkAsRead marks a conversation as read.
// POST /dm/conversations/:id/read
func (h *DMHandler) MarkAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	convID := c.Params("id")

	if err := h.dmService.MarkAsRead(c.Context(), convID, userID); err != nil {
		return h.handleError(c, err)
	}

	// Broadcast read receipt to conversation subscribers
	go h.broadcastDMRead(convID, userID)

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *DMHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, dm.ErrConversationNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Conversation not found",
		))

	case errors.Is(err, dm.ErrMessageNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Message not found",
		))

	case errors.Is(err, dm.ErrNotParticipant):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a participant of this conversation",
		))

	case errors.Is(err, dm.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to perform this action",
		))

	case errors.Is(err, dm.ErrCannotMessageSelf):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"CANNOT_MESSAGE_SELF",
			"Cannot start a conversation with yourself",
		))

	case errors.Is(err, dm.ErrInvalidContent):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Message content must be between 1 and 2000 characters",
		))

	default:
		slog.Error("dm handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func conversationToDTO(conv *dm.Conversation) dto.ConversationResponse {
	resp := dto.ConversationResponse{
		ID:          conv.ID,
		UnreadCount: conv.UnreadCount,
		CreatedAt:   conv.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		UpdatedAt:   conv.UpdatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if conv.OtherUser != nil {
		resp.OtherUser = &dto.ConversationUserResponse{
			ID:             conv.OtherUser.ID,
			Handle:         conv.OtherUser.Handle,
			DisplayName:    conv.OtherUser.DisplayName,
			AvatarGradient: conv.OtherUser.AvatarGradient,
			IsOnline:       conv.OtherUser.IsOnline,
		}
	}

	if conv.LastMessage != nil {
		resp.LastMessage = &dto.LastMessageResponse{
			ID:       conv.LastMessage.ID,
			Content:  conv.LastMessage.Content,
			SenderID: conv.LastMessage.SenderID,
		}
	}

	return resp
}

func messageToDTO(msg *dm.Message) dto.DMMessageResponse {
	resp := dto.DMMessageResponse{
		ID:             msg.ID,
		ConversationID: msg.ConversationID,
		SenderID:       msg.SenderID,
		Content:        msg.Content,
		IsEdited:       msg.IsEdited,
		CreatedAt:      msg.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if msg.Sender != nil {
		resp.Sender = &dto.ConversationUserResponse{
			ID:             msg.Sender.ID,
			Handle:         msg.Sender.Handle,
			DisplayName:    msg.Sender.DisplayName,
			AvatarGradient: msg.Sender.AvatarGradient,
		}
	}

	return resp
}

// broadcastDMMessage broadcasts a DM message event to conversation subscribers.
func (h *DMHandler) broadcastDMMessage(convID string, eventType ws.EventType, msg *dm.Message) {
	if h.hub == nil {
		return
	}

	// Populate sender info if not present
	if msg.Sender == nil && h.userRepo != nil {
		sender, err := h.userRepo.FindByID(context.Background(), msg.SenderID)
		if err == nil && sender != nil {
			msg.Sender = &dm.ConversationUser{
				ID:             sender.ID,
				Handle:         sender.Handle,
				DisplayName:    sender.DisplayName,
				AvatarGradient: sender.AvatarGradient,
			}
		}
	}

	eventData := ws.DMMessageEventData{
		ConversationID: convID,
		Message:        messageToMap(msg),
	}

	wsMsg, err := ws.NewMessage(eventType, eventData)
	if err != nil {
		slog.Error("failed to create WS message", slog.Any("error", err))
		return
	}

	data, err := json.Marshal(wsMsg)
	if err != nil {
		slog.Error("failed to marshal WS message", slog.Any("error", err))
		return
	}

	h.hub.BroadcastToSubscription(ws.SubConversation, convID, data)
}

// broadcastDMRead broadcasts a read receipt event.
func (h *DMHandler) broadcastDMRead(convID, userID string) {
	if h.hub == nil {
		return
	}

	wsMsg, err := ws.NewMessage(ws.EventDMRead, map[string]string{
		"conversationId": convID,
		"userId":         userID,
	})
	if err != nil {
		return
	}

	data, _ := json.Marshal(wsMsg)
	h.hub.BroadcastToSubscription(ws.SubConversation, convID, data)
}

// messageToMap converts a message to a map for WS broadcast.
func messageToMap(msg *dm.Message) map[string]interface{} {
	m := map[string]interface{}{
		"id":             msg.ID,
		"conversationId": msg.ConversationID,
		"senderId":       msg.SenderID,
		"content":        msg.Content,
		"isEdited":       msg.IsEdited,
		"createdAt":      msg.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if msg.Sender != nil {
		m["sender"] = map[string]interface{}{
			"id":             msg.Sender.ID,
			"handle":         msg.Sender.Handle,
			"displayName":    msg.Sender.DisplayName,
			"avatarGradient": msg.Sender.AvatarGradient,
		}
	}

	return m
}
