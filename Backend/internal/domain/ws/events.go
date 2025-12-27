// Package ws defines WebSocket domain types and events.
package ws

import (
	"encoding/json"
	"time"
)

// EventType represents the type of WebSocket event.
type EventType string

const (
	// Connection events
	EventConnected    EventType = "connected"
	EventDisconnected EventType = "disconnected"
	EventError        EventType = "error"

	// Subscription events
	EventSubscribe   EventType = "subscribe"
	EventUnsubscribe EventType = "unsubscribe"
	EventSubscribed  EventType = "subscribed"

	// Presence events
	EventUserOnline   EventType = "user_online"
	EventUserOffline  EventType = "user_offline"
	EventPresenceSync EventType = "presence_sync"

	// Typing events
	EventTypingStart EventType = "typing_start"
	EventTypingStop  EventType = "typing_stop"

	// DM events
	EventDMMessage        EventType = "dm_message"
	EventDMMessageEdited  EventType = "dm_message_edited"
	EventDMMessageDeleted EventType = "dm_message_deleted"
	EventDMRead           EventType = "dm_read"

	// Channel events
	EventChannelMessage        EventType = "channel_message"
	EventChannelMessageEdited  EventType = "channel_message_edited"
	EventChannelMessageDeleted EventType = "channel_message_deleted"

	// Server events
	EventServerJoin  EventType = "server_join"
	EventServerLeave EventType = "server_leave"
	EventMemberJoin  EventType = "member_join"
	EventMemberLeave EventType = "member_leave"

	// Notification events
	EventNotification EventType = "notification"

	// Call signaling events
	EventCallIncoming EventType = "call_incoming"
	EventCallAccepted EventType = "call_accepted"
	EventCallRejected EventType = "call_rejected"
	EventCallEnded    EventType = "call_ended"
	EventCallMissed   EventType = "call_missed"

	// Voice events
	EventVoiceStateUpdate EventType = "voice_state_update"
)

// Message represents a WebSocket message.
type Message struct {
	Type      EventType       `json:"type"`
	Data      json.RawMessage `json:"data,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
	RequestID string          `json:"requestId,omitempty"`
}

// NewMessage creates a new WebSocket message.
func NewMessage(eventType EventType, data interface{}) (*Message, error) {
	var rawData json.RawMessage
	if data != nil {
		b, err := json.Marshal(data)
		if err != nil {
			return nil, err
		}
		rawData = b
	}

	return &Message{
		Type:      eventType,
		Data:      rawData,
		Timestamp: time.Now(),
	}, nil
}

// SubscriptionType represents the type of subscription.
type SubscriptionType string

const (
	SubUser         SubscriptionType = "user"
	SubConversation SubscriptionType = "conversation"
	SubChannel      SubscriptionType = "channel"
	SubServer       SubscriptionType = "server"
)

// Subscription represents a client subscription.
type Subscription struct {
	Type SubscriptionType `json:"type"`
	ID   string           `json:"id"`
}

// SubscribeRequest represents a subscription request.
type SubscribeRequest struct {
	Subscriptions []Subscription `json:"subscriptions"`
}

// UnsubscribeRequest represents an unsubscription request.
type UnsubscribeRequest struct {
	Subscriptions []Subscription `json:"subscriptions"`
}

// TypingEvent represents a typing indicator event.
type TypingEventData struct {
	ConversationID  string `json:"conversationId,omitempty"`
	ChannelID       string `json:"channelId,omitempty"`
	UserID          string `json:"userId"`
	UserHandle      string `json:"userHandle"`
	UserDisplayName string `json:"userDisplayName"`
	IsTyping        bool   `json:"isTyping"`
}

// PresenceEvent represents a presence change event.
type PresenceEventData struct {
	UserID   string `json:"userId"`
	IsOnline bool   `json:"isOnline"`
}

// DMMessageEvent represents a DM message event.
type DMMessageEventData struct {
	ConversationID string                 `json:"conversationId"`
	Message        map[string]interface{} `json:"message"`
}

// ChannelMessageEvent represents a channel message event.
type ChannelMessageEventData struct {
	ChannelID string                 `json:"channelId"`
	ServerID  string                 `json:"serverId"`
	Message   map[string]interface{} `json:"message"`
}

// CallEventData represents a voice/video call signaling event.
type CallEventData struct {
	CallID       string `json:"callId"`
	CallerID     string `json:"callerId"`
	CallerName   string `json:"callerName"`
	CallerAvatar string `json:"callerAvatar,omitempty"`
	CalleeID     string `json:"calleeId"`
	CalleeName   string `json:"calleeName,omitempty"`
	CallType     string `json:"callType"` // "voice" | "video"
	RoomName     string `json:"roomName,omitempty"`
}

// VoiceStateUpdateEventData represents a voice state update.
type VoiceStateUpdateEventData struct {
	ServerID        string `json:"serverId"`
	ChannelID       string `json:"channelId"`
	UserID          string `json:"userId"`
	UserHandle      string `json:"userHandle"`
	UserDisplayName string `json:"userDisplayName"`
	UserAvatar      string `json:"userAvatar"` // gradient URL or similar
	Action          string `json:"action"`     // "joined" or "left"
}
