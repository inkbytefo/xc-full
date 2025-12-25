// Package dm defines the Direct Message domain entities and types.
package dm

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrConversationNotFound = errors.New("conversation not found")
	ErrMessageNotFound      = errors.New("message not found")
	ErrNotParticipant       = errors.New("not a participant")
	ErrNoPermission         = errors.New("no permission")
	ErrCannotMessageSelf    = errors.New("cannot message yourself")
	ErrInvalidContent       = errors.New("invalid message content")
)

// Conversation represents a DM conversation between users.
type Conversation struct {
	ID           string
	Participants []string
	LastMessage  *Message
	CreatedAt    time.Time
	UpdatedAt    time.Time

	// Joined fields
	UnreadCount int
	OtherUser   *ConversationUser
}

// ConversationUser represents user info in a conversation.
type ConversationUser struct {
	ID             string
	Handle         string
	DisplayName    string
	AvatarGradient [2]string
	IsOnline       bool
}

// Message represents a DM message.
type Message struct {
	ID             string
	ConversationID string
	SenderID       string
	Content        string
	IsEdited       bool
	ReadAt         *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time

	// Joined fields
	Sender *ConversationUser
}

// ReadReceipt represents a read receipt for a conversation.
type ReadReceipt struct {
	ConversationID string
	UserID         string
	LastReadAt     time.Time
	LastMessageID  string
}

// TypingEvent represents a typing indicator event.
type TypingEvent struct {
	ConversationID string
	UserID         string
	IsTyping       bool
	Timestamp      time.Time
}
