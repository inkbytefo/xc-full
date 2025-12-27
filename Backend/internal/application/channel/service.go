// Package channel provides channel-related application services.
package channel

import (
	"context"
	"time"

	"xcord/internal/domain/channel"
	"xcord/internal/domain/readstate"
	"xcord/internal/domain/server"
	"xcord/internal/pkg/id"
)

// Service provides channel-related operations.
type Service struct {
	channelRepo   channel.Repository
	memberRepo    server.MemberRepository
	serverRepo    server.Repository
	readStateRepo readstate.Repository
}

// NewService creates a new channel service.
func NewService(
	channelRepo channel.Repository,
	memberRepo server.MemberRepository,
	serverRepo server.Repository,
	readStateRepo readstate.Repository,
) *Service {
	return &Service{
		channelRepo:   channelRepo,
		memberRepo:    memberRepo,
		serverRepo:    serverRepo,
		readStateRepo: readStateRepo,
	}
}

// CreateCommand represents a channel creation request.
type CreateCommand struct {
	ServerID    string
	ParentID    *string // Category ID (optional)
	Name        string
	Description string
	Type        channel.ChannelType
	UserID      string
}

// Create creates a new channel.
func (s *Service) Create(ctx context.Context, cmd CreateCommand) (*channel.Channel, error) {
	// Check permission
	if !s.canManageChannels(ctx, cmd.ServerID, cmd.UserID) {
		return nil, channel.ErrNoPermission
	}

	// Validate channel type
	if !cmd.Type.IsValid() {
		cmd.Type = channel.TypeText
	}

	// Get current channel count for position
	channels, err := s.channelRepo.FindByServerID(ctx, cmd.ServerID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	ch := &channel.Channel{
		ID:          id.Generate("chan"),
		ServerID:    cmd.ServerID,
		ParentID:    cmd.ParentID,
		Name:        cmd.Name,
		Description: cmd.Description,
		Type:        cmd.Type,
		Position:    len(channels),
		IsPrivate:   false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.channelRepo.Create(ctx, ch); err != nil {
		return nil, err
	}

	return ch, nil
}

// ListByServer lists all channels in a server.
func (s *Service) ListByServer(ctx context.Context, serverID, userID string) ([]*channel.Channel, error) {
	// Check membership
	isMember, err := s.memberRepo.IsMember(ctx, serverID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, server.ErrNotMember
	}

	return s.channelRepo.FindByServerID(ctx, serverID)
}

// GetByID retrieves a channel by ID.
func (s *Service) GetByID(ctx context.Context, id, userID string) (*channel.Channel, error) {
	ch, err := s.channelRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check membership
	isMember, err := s.memberRepo.IsMember(ctx, ch.ServerID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, channel.ErrNoPermission
	}

	return ch, nil
}

// UpdateCommand represents a channel update request.
type UpdateCommand struct {
	ID          string
	ServerID    string
	Name        string
	Description string
	ParentID    *string
	Position    *int
	UserID      string
}

// Update updates a channel.
func (s *Service) Update(ctx context.Context, cmd UpdateCommand) (*channel.Channel, error) {
	// Check permission
	if !s.canManageChannels(ctx, cmd.ServerID, cmd.UserID) {
		return nil, channel.ErrNoPermission
	}

	ch, err := s.channelRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, err
	}

	if ch.ServerID != cmd.ServerID {
		return nil, channel.ErrNotFound
	}

	ch.Name = cmd.Name
	ch.Description = cmd.Description
	ch.ParentID = cmd.ParentID
	if cmd.Position != nil {
		ch.Position = *cmd.Position
	}

	if err := s.channelRepo.Update(ctx, ch); err != nil {
		return nil, err
	}

	return ch, nil
}

// Delete deletes a channel.
func (s *Service) Delete(ctx context.Context, id, serverID, userID string) error {
	// Check permission
	if !s.canManageChannels(ctx, serverID, userID) {
		return channel.ErrNoPermission
	}

	ch, err := s.channelRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if ch.ServerID != serverID {
		return channel.ErrNotFound
	}

	return s.channelRepo.Delete(ctx, id)
}

// ReorderCommand represents a channel reorder request.
type ReorderCommand struct {
	ServerID string
	UserID   string
	Updates  []ChannelPositionUpdate
}

type ChannelPositionUpdate struct {
	ID       string
	Position int
	ParentID *string
}

// Reorder updates positions of multiple channels.
func (s *Service) Reorder(ctx context.Context, cmd ReorderCommand) error {
	// Check permission
	if !s.canManageChannels(ctx, cmd.ServerID, cmd.UserID) {
		return channel.ErrNoPermission
	}

	// Verify all channels belong to the server (optimization: could be done in repo)
	// For now, we'll let the repo handle it or verify individually if needed.
	// A robust approach involves fetching all involved channels.

	// In a real implementation, we should use a transaction.
	// Here we will iterate and update.
	for _, update := range cmd.Updates {
		ch, err := s.channelRepo.FindByID(ctx, update.ID)
		if err != nil {
			continue // Skip not found channels or error
		}

		if ch.ServerID != cmd.ServerID {
			continue // wrong server
		}

		ch.Position = update.Position
		ch.ParentID = update.ParentID

		if err := s.channelRepo.Update(ctx, ch); err != nil {
			return err
		}
	}

	return nil
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

// canManageChannels checks if a user can manage channels in a server.
func (s *Service) canManageChannels(ctx context.Context, serverID, userID string) bool {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return false
	}

	// Owner can always manage
	if srv.OwnerID == userID {
		return true
	}

	// Check member permissions
	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, serverID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageChannels)
}

// AckMessage acknowledges a message reading.
func (s *Service) AckMessage(ctx context.Context, userID, channelID, messageID string) error {
	// Get channel to find ServerID
	ch, err := s.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}

	// Check membership
	isMember, err := s.memberRepo.IsMember(ctx, ch.ServerID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return server.ErrNotMember
	}

	return s.readStateRepo.Upsert(ctx, &readstate.ReadState{
		UserID:            userID,
		ChannelID:         channelID,
		LastReadMessageID: &messageID,
		LastReadAt:        time.Now(),
	})
}
