// Package channel provides channel-related application services.
package channel

import (
	"context"
	"time"

	"xcord/internal/domain/channel"
	"xcord/internal/domain/server"
	"xcord/internal/pkg/id"
)

// MessageService provides channel message-related operations.
type MessageService struct {
	messageRepo channel.MessageRepository
	channelRepo channel.Repository
	memberRepo  server.MemberRepository
	serverRepo  server.Repository
}

// NewMessageService creates a new MessageService.
func NewMessageService(
	messageRepo channel.MessageRepository,
	channelRepo channel.Repository,
	memberRepo server.MemberRepository,
	serverRepo server.Repository,
) *MessageService {
	return &MessageService{
		messageRepo: messageRepo,
		channelRepo: channelRepo,
		memberRepo:  memberRepo,
		serverRepo:  serverRepo,
	}
}

// GetMessagesCommand represents a request to get messages.
type GetMessagesCommand struct {
	ServerID  string
	ChannelID string
	UserID    string
	Cursor    string
	Limit     int
}

// GetMessages retrieves messages from a channel.
func (s *MessageService) GetMessages(ctx context.Context, cmd GetMessagesCommand) ([]*channel.ChannelMessage, string, error) {
	// Check membership
	if err := s.requireMembership(ctx, cmd.ServerID, cmd.UserID); err != nil {
		return nil, "", err
	}

	// Verify channel exists and belongs to server
	if err := s.validateChannel(ctx, cmd.ChannelID, cmd.ServerID); err != nil {
		return nil, "", err
	}

	return s.messageRepo.FindByChannelID(ctx, cmd.ChannelID, cmd.Cursor, cmd.Limit)
}

// SendMessageCommand represents a request to send a message.
type SendMessageCommand struct {
	ServerID  string
	ChannelID string
	UserID    string
	Content   string
	ReplyToID *string
}

// SendMessage sends a message to a channel.
func (s *MessageService) SendMessage(ctx context.Context, cmd SendMessageCommand) (*channel.ChannelMessage, error) {
	// Check membership
	if err := s.requireMembership(ctx, cmd.ServerID, cmd.UserID); err != nil {
		return nil, err
	}

	// Verify channel exists and belongs to server
	if err := s.validateChannel(ctx, cmd.ChannelID, cmd.ServerID); err != nil {
		return nil, err
	}

	// Validate content
	if len(cmd.Content) == 0 || len(cmd.Content) > 2000 {
		return nil, channel.ErrInvalidContent
	}

	now := time.Now()
	msg := &channel.ChannelMessage{
		ID:        id.Generate("cmsg"),
		ChannelID: cmd.ChannelID,
		ServerID:  cmd.ServerID,
		AuthorID:  cmd.UserID,
		Content:   cmd.Content,
		IsEdited:  false,
		IsPinned:  false,
		ReplyToID: cmd.ReplyToID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.messageRepo.Create(ctx, msg); err != nil {
		return nil, err
	}

	return msg, nil
}

// EditMessage edits a message.
func (s *MessageService) EditMessage(ctx context.Context, serverID, channelID, messageID, userID, content string) (*channel.ChannelMessage, error) {
	// Check membership
	if err := s.requireMembership(ctx, serverID, userID); err != nil {
		return nil, err
	}

	// Find message
	msg, err := s.messageRepo.FindByID(ctx, messageID)
	if err != nil {
		return nil, err
	}

	// Verify message belongs to channel and server
	if msg.ServerID != serverID || msg.ChannelID != channelID {
		return nil, channel.ErrMessageNotFound
	}

	// Only author can edit
	if msg.AuthorID != userID {
		return nil, channel.ErrNoPermission
	}

	// Validate content
	if len(content) == 0 || len(content) > 2000 {
		return nil, channel.ErrInvalidContent
	}

	msg.Content = content
	msg.IsEdited = true
	msg.UpdatedAt = time.Now()

	if err := s.messageRepo.Update(ctx, msg); err != nil {
		return nil, err
	}

	return msg, nil
}

// DeleteMessage deletes a message.
func (s *MessageService) DeleteMessage(ctx context.Context, serverID, channelID, messageID, userID string) error {
	// Check membership
	if err := s.requireMembership(ctx, serverID, userID); err != nil {
		return err
	}

	// Find message
	msg, err := s.messageRepo.FindByID(ctx, messageID)
	if err != nil {
		return err
	}

	// Verify message belongs to channel and server
	if msg.ServerID != serverID || msg.ChannelID != channelID {
		return channel.ErrMessageNotFound
	}

	// Check permission: owner or has ManageMessages
	if msg.AuthorID != userID {
		if !s.canManageMessages(ctx, serverID, userID) {
			return channel.ErrNoPermission
		}
	}

	return s.messageRepo.Delete(ctx, messageID)
}

// SearchMessages searches messages in a channel.
func (s *MessageService) SearchMessages(ctx context.Context, serverID, channelID, userID, query string, limit int) ([]*channel.ChannelMessage, error) {
	// Check membership
	if err := s.requireMembership(ctx, serverID, userID); err != nil {
		return nil, err
	}

	if query == "" {
		return nil, channel.ErrInvalidContent
	}

	return s.messageRepo.Search(ctx, channelID, query, limit)
}

// ============================================================================
// HELPER METHODS
// ============================================================================

func (s *MessageService) requireMembership(ctx context.Context, serverID, userID string) error {
	member, err := s.memberRepo.FindByServerAndUser(ctx, serverID, userID)
	if err != nil || member == nil {
		return server.ErrNotMember
	}
	return nil
}

func (s *MessageService) validateChannel(ctx context.Context, channelID, serverID string) error {
	ch, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil || ch == nil || ch.ServerID != serverID {
		return channel.ErrNotFound
	}
	return nil
}

func (s *MessageService) canManageMessages(ctx context.Context, serverID, userID string) bool {
	// Check if owner
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err == nil && srv.OwnerID == userID {
		return true
	}

	// Check role permissions
	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, serverID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageMessages)
}
