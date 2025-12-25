// Package dm provides DM-related application services.
package dm

import (
	"context"
	"time"

	"github.com/google/uuid"

	"xcord/internal/domain/dm"
)

// Service provides DM-related operations.
type Service struct {
	convRepo    dm.ConversationRepository
	messageRepo dm.MessageRepository
}

// NewService creates a new DM service.
func NewService(
	convRepo dm.ConversationRepository,
	messageRepo dm.MessageRepository,
) *Service {
	return &Service{
		convRepo:    convRepo,
		messageRepo: messageRepo,
	}
}

// GetConversations retrieves all conversations for a user.
func (s *Service) GetConversations(ctx context.Context, userID string) ([]*dm.Conversation, error) {
	convs, err := s.convRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get unread counts
	for _, conv := range convs {
		count, err := s.messageRepo.GetUnreadCount(ctx, conv.ID, userID)
		if err == nil {
			conv.UnreadCount = count
		}
	}

	return convs, nil
}

// GetConversation retrieves a conversation by ID.
func (s *Service) GetConversation(ctx context.Context, convID, userID string) (*dm.Conversation, error) {
	isParticipant, err := s.convRepo.IsParticipant(ctx, convID, userID)
	if err != nil {
		return nil, err
	}
	if !isParticipant {
		return nil, dm.ErrNotParticipant
	}

	return s.convRepo.FindByID(ctx, convID)
}

// StartConversation starts a new conversation or returns existing one.
func (s *Service) StartConversation(ctx context.Context, userID, otherUserID string) (*dm.Conversation, error) {
	if userID == otherUserID {
		return nil, dm.ErrCannotMessageSelf
	}

	// Check if conversation already exists
	existing, err := s.convRepo.FindByParticipants(ctx, userID, otherUserID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	// Create new conversation
	now := time.Now()
	conv := &dm.Conversation{
		ID:           generateID("conv"),
		Participants: []string{userID, otherUserID},
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.convRepo.Create(ctx, conv); err != nil {
		return nil, err
	}

	return conv, nil
}

// GetMessages retrieves messages in a conversation.
func (s *Service) GetMessages(ctx context.Context, convID, userID, cursor string, limit int) ([]*dm.Message, string, error) {
	isParticipant, err := s.convRepo.IsParticipant(ctx, convID, userID)
	if err != nil {
		return nil, "", err
	}
	if !isParticipant {
		return nil, "", dm.ErrNotParticipant
	}

	return s.messageRepo.FindByConversationID(ctx, convID, cursor, limit)
}

// SendMessageCommand represents a message send request.
type SendMessageCommand struct {
	ConversationID string
	SenderID       string
	Content        string
}

// SendMessage sends a message in a conversation.
func (s *Service) SendMessage(ctx context.Context, cmd SendMessageCommand) (*dm.Message, error) {
	if len(cmd.Content) == 0 || len(cmd.Content) > 2000 {
		return nil, dm.ErrInvalidContent
	}

	isParticipant, err := s.convRepo.IsParticipant(ctx, cmd.ConversationID, cmd.SenderID)
	if err != nil {
		return nil, err
	}
	if !isParticipant {
		return nil, dm.ErrNotParticipant
	}

	now := time.Now()
	msg := &dm.Message{
		ID:             generateID("dmsg"),
		ConversationID: cmd.ConversationID,
		SenderID:       cmd.SenderID,
		Content:        cmd.Content,
		IsEdited:       false,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.messageRepo.Create(ctx, msg); err != nil {
		return nil, err
	}

	// Update last message in conversation
	_ = s.convRepo.UpdateLastMessage(ctx, cmd.ConversationID, msg.ID)

	return msg, nil
}

// EditMessage edits a message.
func (s *Service) EditMessage(ctx context.Context, messageID, userID, content string) (*dm.Message, error) {
	if len(content) == 0 || len(content) > 2000 {
		return nil, dm.ErrInvalidContent
	}

	msg, err := s.messageRepo.FindByID(ctx, messageID)
	if err != nil {
		return nil, err
	}

	if msg.SenderID != userID {
		return nil, dm.ErrNoPermission
	}

	msg.Content = content
	msg.IsEdited = true

	if err := s.messageRepo.Update(ctx, msg); err != nil {
		return nil, err
	}

	return msg, nil
}

// DeleteMessage deletes a message.
func (s *Service) DeleteMessage(ctx context.Context, messageID, userID string) error {
	msg, err := s.messageRepo.FindByID(ctx, messageID)
	if err != nil {
		return err
	}

	if msg.SenderID != userID {
		return dm.ErrNoPermission
	}

	return s.messageRepo.Delete(ctx, messageID)
}

// MarkAsRead marks a conversation as read.
func (s *Service) MarkAsRead(ctx context.Context, convID, userID string) error {
	isParticipant, err := s.convRepo.IsParticipant(ctx, convID, userID)
	if err != nil {
		return err
	}
	if !isParticipant {
		return dm.ErrNotParticipant
	}

	return s.messageRepo.MarkAsRead(ctx, convID, userID, "")
}

func generateID(prefix string) string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	if len(prefix) > 4 {
		prefix = prefix[:4]
	}
	return prefix + "_" + clean[:21]
}
