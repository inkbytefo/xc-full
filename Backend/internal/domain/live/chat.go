package live

import (
	"context"
	"time"

	"pink/internal/domain/user"
)

// ChatMessage represents a message in a stream chat.
type ChatMessage struct {
	ID        string    `json:"id"`
	StreamID  string    `json:"stream_id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`

	// Populated fields
	User *user.User `json:"user,omitempty"`
}

// StreamMessageRepository defines the interface for stream chat message storage.
type StreamMessageRepository interface {
	// Create persists a new chat message.
	Create(ctx context.Context, msg *ChatMessage) error

	// FindByStreamID returns recent messages for a stream with cursor-based pagination.
	// before is the ID of the message to start fetching before (for pagination).
	FindByStreamID(ctx context.Context, streamID string, limit int, before string) ([]*ChatMessage, error)
}
