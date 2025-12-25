package dm

import "context"

// ConversationRepository defines the interface for conversation data access.
type ConversationRepository interface {
	// FindByID finds a conversation by its ID.
	FindByID(ctx context.Context, id string) (*Conversation, error)

	// FindByUserID finds all conversations for a user.
	FindByUserID(ctx context.Context, userID string) ([]*Conversation, error)

	// FindByParticipants finds a conversation between two users.
	FindByParticipants(ctx context.Context, userID1, userID2 string) (*Conversation, error)

	// Create creates a new conversation.
	Create(ctx context.Context, conv *Conversation) error

	// UpdateLastMessage updates the last message of a conversation.
	UpdateLastMessage(ctx context.Context, convID, messageID string) error

	// IsParticipant checks if a user is a participant of a conversation.
	IsParticipant(ctx context.Context, convID, userID string) (bool, error)
}

// MessageRepository defines the interface for DM message data access.
type MessageRepository interface {
	// FindByID finds a message by its ID.
	FindByID(ctx context.Context, id string) (*Message, error)

	// FindByConversationID finds messages in a conversation with pagination.
	FindByConversationID(ctx context.Context, convID, cursor string, limit int) ([]*Message, string, error)

	// Create creates a new message.
	Create(ctx context.Context, message *Message) error

	// Update updates a message.
	Update(ctx context.Context, message *Message) error

	// Delete deletes a message.
	Delete(ctx context.Context, id string) error

	// MarkAsRead marks messages as read up to a certain message.
	MarkAsRead(ctx context.Context, convID, userID, messageID string) error

	// GetUnreadCount gets the unread message count for a user in a conversation.
	GetUnreadCount(ctx context.Context, convID, userID string) (int, error)
}
