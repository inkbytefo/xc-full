// Package ws provides WebSocket hub for managing client connections.
package ws

import (
	"encoding/json"
	"sync"

	"github.com/gofiber/contrib/websocket"

	wsDomain "xcord/internal/domain/ws"
)

// Client represents a connected WebSocket client.
type Client struct {
	ID            string
	UserID        string
	Conn          *websocket.Conn
	Subscriptions map[string]bool // subscription key -> subscribed
	Send          chan []byte
	mu            sync.RWMutex
}

// NewClient creates a new WebSocket client.
func NewClient(id, userID string, conn *websocket.Conn) *Client {
	return &Client{
		ID:            id,
		UserID:        userID,
		Conn:          conn,
		Subscriptions: make(map[string]bool),
		Send:          make(chan []byte, 256),
	}
}

// Subscribe adds a subscription.
func (c *Client) Subscribe(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Subscriptions[key] = true
}

// Unsubscribe removes a subscription.
func (c *Client) Unsubscribe(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.Subscriptions, key)
}

// IsSubscribed checks if subscribed to a key.
func (c *Client) IsSubscribed(key string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Subscriptions[key]
}

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	// Registered clients by client ID
	clients map[string]*Client

	// Clients by user ID (one user can have multiple connections)
	userClients map[string]map[string]*Client

	// Subscriptions: subscription key -> client IDs
	subscriptions map[string]map[string]bool

	// Online users
	onlineUsers map[string]bool

	// Register requests
	register chan *Client

	// Unregister requests
	unregister chan *Client

	// Mutex for thread safety
	mu sync.RWMutex
}

// NewHub creates a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:       make(map[string]*Client),
		userClients:   make(map[string]map[string]*Client),
		subscriptions: make(map[string]map[string]bool),
		onlineUsers:   make(map[string]bool),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
	}
}

// Run starts the hub's event loop.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)
		case client := <-h.unregister:
			h.unregisterClient(client)
		}
	}
}

// Register registers a new client.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister unregisters a client.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client.ID] = client

	// Add to user clients
	if h.userClients[client.UserID] == nil {
		h.userClients[client.UserID] = make(map[string]*Client)
	}
	h.userClients[client.UserID][client.ID] = client

	// Mark user as online
	wasOffline := !h.onlineUsers[client.UserID]
	h.onlineUsers[client.UserID] = true

	// Auto-subscribe to user's personal channel
	subKey := "user:" + client.UserID
	client.Subscribe(subKey)
	if h.subscriptions[subKey] == nil {
		h.subscriptions[subKey] = make(map[string]bool)
	}
	h.subscriptions[subKey][client.ID] = true

	// Broadcast online status if was offline
	if wasOffline {
		go h.broadcastPresence(client.UserID, true)
	}
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.ID]; !ok {
		return
	}

	// Remove from subscriptions
	for key := range client.Subscriptions {
		if h.subscriptions[key] != nil {
			delete(h.subscriptions[key], client.ID)
			if len(h.subscriptions[key]) == 0 {
				delete(h.subscriptions, key)
			}
		}
	}

	// Remove from user clients
	if h.userClients[client.UserID] != nil {
		delete(h.userClients[client.UserID], client.ID)
		if len(h.userClients[client.UserID]) == 0 {
			delete(h.userClients, client.UserID)
			// Mark user as offline
			delete(h.onlineUsers, client.UserID)
			go h.broadcastPresence(client.UserID, false)
		}
	}

	// Remove client
	delete(h.clients, client.ID)
	close(client.Send)
}

// Subscribe adds a subscription for a client.
func (h *Hub) Subscribe(clientID string, subType wsDomain.SubscriptionType, id string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client, ok := h.clients[clientID]
	if !ok {
		return
	}

	subKey := string(subType) + ":" + id
	client.Subscribe(subKey)

	if h.subscriptions[subKey] == nil {
		h.subscriptions[subKey] = make(map[string]bool)
	}
	h.subscriptions[subKey][clientID] = true
}

// Unsubscribe removes a subscription for a client.
func (h *Hub) Unsubscribe(clientID string, subType wsDomain.SubscriptionType, id string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client, ok := h.clients[clientID]
	if !ok {
		return
	}

	subKey := string(subType) + ":" + id
	client.Unsubscribe(subKey)

	if h.subscriptions[subKey] != nil {
		delete(h.subscriptions[subKey], clientID)
		if len(h.subscriptions[subKey]) == 0 {
			delete(h.subscriptions, subKey)
		}
	}
}

// BroadcastToSubscription sends a message to all clients subscribed to a key.
func (h *Hub) BroadcastToSubscription(subType wsDomain.SubscriptionType, id string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	subKey := string(subType) + ":" + id
	clientIDs, ok := h.subscriptions[subKey]
	if !ok {
		return
	}

	for clientID := range clientIDs {
		if client, ok := h.clients[clientID]; ok {
			select {
			case client.Send <- message:
			default:
				// Client buffer full, skip
			}
		}
	}
}

// BroadcastToUser sends a message to all connections of a user.
func (h *Hub) BroadcastToUser(userID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.userClients[userID]
	if !ok {
		return
	}

	for _, client := range clients {
		select {
		case client.Send <- message:
		default:
			// Client buffer full, skip
		}
	}
}

// IsUserOnline checks if a user is online.
func (h *Hub) IsUserOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.onlineUsers[userID]
}

// GetOnlineUsers returns all online user IDs.
func (h *Hub) GetOnlineUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]string, 0, len(h.onlineUsers))
	for userID := range h.onlineUsers {
		users = append(users, userID)
	}
	return users
}

func (h *Hub) broadcastPresence(userID string, isOnline bool) {
	msg, err := wsDomain.NewMessage(wsDomain.EventUserOnline, wsDomain.PresenceEventData{
		UserID:   userID,
		IsOnline: isOnline,
	})
	if err != nil {
		return
	}

	if !isOnline {
		msg.Type = wsDomain.EventUserOffline
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	// Broadcast to all connected clients (simplified)
	h.mu.RLock()
	for _, client := range h.clients {
		select {
		case client.Send <- data:
		default:
		}
	}
	h.mu.RUnlock()
}
