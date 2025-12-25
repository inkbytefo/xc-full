package handlers

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"xcord/internal/domain/ws"
	wsInfra "xcord/internal/infrastructure/ws"
)

// WebSocketHandler handles WebSocket connections.
type WebSocketHandler struct {
	hub *wsInfra.Hub
}

// NewWebSocketHandler creates a new WebSocketHandler.
func NewWebSocketHandler(hub *wsInfra.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: hub}
}

// Upgrade is the middleware to upgrade HTTP to WebSocket.
func (h *WebSocketHandler) Upgrade() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// Handle handles WebSocket connections.
func (h *WebSocketHandler) Handle() fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		// Get user ID from context (set by auth middleware)
		userID, ok := c.Locals("userID").(string)
		if !ok || userID == "" {
			slog.Warn("WebSocket connection without auth")
			c.Close()
			return
		}

		// Create client
		clientID := uuid.New().String()
		client := wsInfra.NewClient(clientID, userID, c)

		// Register client
		h.hub.Register(client)
		defer h.hub.Unregister(client)

		// Send connected message
		connectedMsg, _ := ws.NewMessage(ws.EventConnected, map[string]string{
			"clientId": clientID,
			"userId":   userID,
		})
		if data, err := json.Marshal(connectedMsg); err == nil {
			client.Send <- data
		}

		// Start write pump
		go h.writePump(client)

		// Start read pump (blocking)
		h.readPump(client)
	})
}

func (h *WebSocketHandler) readPump(client *wsInfra.Client) {
	defer func() {
		h.hub.Unregister(client)
		client.Conn.Close()
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("WebSocket read error", slog.Any("error", err))
			}
			break
		}

		h.handleMessage(client, message)
	}
}

func (h *WebSocketHandler) writePump(client *wsInfra.Client) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			if !ok {
				// Channel closed
				_ = client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			// Send ping
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *WebSocketHandler) handleMessage(client *wsInfra.Client, data []byte) {
	var msg ws.Message
	if err := json.Unmarshal(data, &msg); err != nil {
		slog.Warn("Invalid WebSocket message", slog.Any("error", err))
		return
	}

	switch msg.Type {
	case ws.EventSubscribe:
		h.handleSubscribe(client, msg.Data)

	case ws.EventUnsubscribe:
		h.handleUnsubscribe(client, msg.Data)

	case ws.EventTypingStart, ws.EventTypingStop:
		h.handleTyping(client, msg)

	default:
		slog.Debug("Unknown message type", slog.String("type", string(msg.Type)))
	}
}

func (h *WebSocketHandler) handleSubscribe(client *wsInfra.Client, data json.RawMessage) {
	var req ws.SubscribeRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return
	}

	for _, sub := range req.Subscriptions {
		h.hub.Subscribe(client.ID, sub.Type, sub.ID)
	}

	// Send confirmation
	resp, _ := ws.NewMessage(ws.EventSubscribed, map[string]interface{}{
		"subscriptions": req.Subscriptions,
	})
	if data, err := json.Marshal(resp); err == nil {
		client.Send <- data
	}
}

func (h *WebSocketHandler) handleUnsubscribe(client *wsInfra.Client, data json.RawMessage) {
	var req ws.UnsubscribeRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return
	}

	for _, sub := range req.Subscriptions {
		h.hub.Unsubscribe(client.ID, sub.Type, sub.ID)
	}
}

func (h *WebSocketHandler) handleTyping(client *wsInfra.Client, msg ws.Message) {
	var typingData ws.TypingEventData
	if err := json.Unmarshal(msg.Data, &typingData); err != nil {
		return
	}

	typingData.UserID = client.UserID
	typingData.IsTyping = msg.Type == ws.EventTypingStart

	// Broadcast to conversation or channel subscribers
	broadcastMsg, _ := ws.NewMessage(msg.Type, typingData)
	data, _ := json.Marshal(broadcastMsg)

	if typingData.ConversationID != "" {
		h.hub.BroadcastToSubscription(ws.SubConversation, typingData.ConversationID, data)
	} else if typingData.ChannelID != "" {
		h.hub.BroadcastToSubscription(ws.SubChannel, typingData.ChannelID, data)
	}
}

// BroadcastDMMessage broadcasts a DM message to conversation subscribers.
func (h *WebSocketHandler) BroadcastDMMessage(conversationID string, eventType ws.EventType, message interface{}) {
	msg, err := ws.NewMessage(eventType, ws.DMMessageEventData{
		ConversationID: conversationID,
		Message:        toMap(message),
	})
	if err != nil {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.hub.BroadcastToSubscription(ws.SubConversation, conversationID, data)
}

// BroadcastChannelMessage broadcasts a channel message.
func (h *WebSocketHandler) BroadcastChannelMessage(serverID, channelID string, eventType ws.EventType, message interface{}) {
	msg, err := ws.NewMessage(eventType, ws.ChannelMessageEventData{
		ServerID:  serverID,
		ChannelID: channelID,
		Message:   toMap(message),
	})
	if err != nil {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.hub.BroadcastToSubscription(ws.SubChannel, channelID, data)
}

// BroadcastToUser sends a message to all connections of a user.
func (h *WebSocketHandler) BroadcastToUser(userID string, eventType ws.EventType, payload interface{}) {
	msg, err := ws.NewMessage(eventType, payload)
	if err != nil {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.hub.BroadcastToUser(userID, data)
}

func toMap(v interface{}) map[string]interface{} {
	data, _ := json.Marshal(v)
	var result map[string]interface{}
	_ = json.Unmarshal(data, &result)
	return result
}
