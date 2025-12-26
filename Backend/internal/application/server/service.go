// Package server provides server-related application services.
package server

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	channelDomain "xcord/internal/domain/channel"
	"xcord/internal/domain/server"
)

// Service provides server-related operations.
type Service struct {
	serverRepo      server.Repository
	memberRepo      server.MemberRepository
	roleRepo        server.RoleRepository
	channelRepo     channelDomain.Repository
	joinRequestRepo server.JoinRequestRepository
}

// NewService creates a new server service.
func NewService(
	serverRepo server.Repository,
	memberRepo server.MemberRepository,
	roleRepo server.RoleRepository,
	channelRepo channelDomain.Repository,
	joinRequestRepo server.JoinRequestRepository,
) *Service {
	return &Service{
		serverRepo:      serverRepo,
		memberRepo:      memberRepo,
		roleRepo:        roleRepo,
		channelRepo:     channelRepo,
		joinRequestRepo: joinRequestRepo,
	}
}

// CreateCommand represents a server creation request.
type CreateCommand struct {
	Name        string
	Description string
	OwnerID     string
	IsPublic    bool
}

// Create creates a new server.
func (s *Service) Create(ctx context.Context, cmd CreateCommand) (*server.Server, error) {
	now := time.Now()

	srv := &server.Server{
		ID:           generateID("serv"),
		Name:         cmd.Name,
		Description:  cmd.Description,
		IconGradient: generateGradient(),
		OwnerID:      cmd.OwnerID,
		MemberCount:  1,
		IsPublic:     cmd.IsPublic,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.serverRepo.Create(ctx, srv); err != nil {
		return nil, err
	}

	// Create default @everyone role with default permissions
	everyoneRole := &server.Role{
		ID:          generateID("role"),
		ServerID:    srv.ID,
		Name:        "@everyone",
		Color:       "#99AAB5",
		Position:    0,
		Permissions: server.PermissionDefaultEveryone,
		IsDefault:   true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.roleRepo.Create(ctx, everyoneRole); err != nil {
		_ = s.serverRepo.Delete(ctx, srv.ID)
		return nil, err
	}

	// Add owner as member
	member := &server.Member{
		ID:       generateID("memb"),
		ServerID: srv.ID,
		UserID:   cmd.OwnerID,
		JoinedAt: now,
	}

	if err := s.memberRepo.Create(ctx, member); err != nil {
		_ = s.serverRepo.Delete(ctx, srv.ID)
		return nil, err
	}

	// Assign the @everyone role to the owner
	if err := s.memberRepo.AssignRole(ctx, member.ID, everyoneRole.ID); err != nil {
		slog.Warn("assign @everyone role failed", slog.Any("error", err))
	}

	// Create default "general" channel
	ch := &channelDomain.Channel{
		ID:        generateID("chan"),
		ServerID:  srv.ID,
		Name:      "general",
		Type:      channelDomain.TypeText,
		Position:  0,
		IsPrivate: false,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.channelRepo.Create(ctx, ch); err != nil {
		slog.Warn("create default channel failed", slog.Any("error", err))
	}

	return srv, nil
}

// GetByID retrieves a server by ID.
func (s *Service) GetByID(ctx context.Context, id, userID string) (*server.Server, error) {
	srv, err := s.serverRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if public or user is member
	if !srv.IsPublic {
		isMember, err := s.memberRepo.IsMember(ctx, id, userID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, server.ErrNotFound
		}
	}

	return srv, nil
}

// ListByUser lists all servers a user is a member of.
func (s *Service) ListByUser(ctx context.Context, userID string) ([]*server.Server, error) {
	return s.serverRepo.FindByUserID(ctx, userID)
}

// UpdateCommand represents a server update request.
type UpdateCommand struct {
	ID          string
	Name        string
	Description string
	IsPublic    bool
	UserID      string
}

type JoinResult struct {
	Joined  bool
	Pending bool
}

// Update updates a server.
func (s *Service) Update(ctx context.Context, cmd UpdateCommand) (*server.Server, error) {
	srv, err := s.serverRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, err
	}

	// Check permission: owner or has ManageServer permission
	if !s.canManageServer(ctx, srv, cmd.UserID) {
		return nil, server.ErrNoPermission
	}

	srv.Name = cmd.Name
	srv.Description = cmd.Description
	srv.IsPublic = cmd.IsPublic

	if err := s.serverRepo.Update(ctx, srv); err != nil {
		return nil, err
	}

	return srv, nil
}

// Delete deletes a server.
func (s *Service) Delete(ctx context.Context, id, userID string) error {
	srv, err := s.serverRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// Only owner can delete
	if srv.OwnerID != userID {
		return server.ErrNoPermission
	}

	return s.serverRepo.Delete(ctx, id)
}

// Join allows a user to join a server.
func (s *Service) Join(ctx context.Context, serverID, userID string) (JoinResult, error) {
	isMember, err := s.memberRepo.IsMember(ctx, serverID, userID)
	if err != nil {
		return JoinResult{}, err
	}
	if isMember {
		member, err := s.memberRepo.FindByServerAndUser(ctx, serverID, userID)
		if err == nil && member != nil {
			everyoneRole, err := s.roleRepo.FindDefaultRole(ctx, serverID)
			if err == nil && everyoneRole != nil {
				_ = s.memberRepo.AssignRole(ctx, member.ID, everyoneRole.ID)
			}
		}
		return JoinResult{Joined: true}, nil
	}

	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return JoinResult{}, err
	}

	if !srv.IsPublic {
		if s.joinRequestRepo == nil {
			return JoinResult{}, server.ErrNoPermission
		}

		req := &server.JoinRequest{
			ServerID:   serverID,
			UserID:     userID,
			Status:     server.JoinRequestStatusPending,
			Message:    "",
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if err := s.joinRequestRepo.Create(ctx, req); err != nil {
			return JoinResult{}, err
		}

		return JoinResult{Pending: true}, nil
	}

	member := &server.Member{
		ID:       generateID("memb"),
		ServerID: serverID,
		UserID:   userID,
		JoinedAt: time.Now(),
	}

	if err := s.memberRepo.Create(ctx, member); err != nil {
		if errors.Is(err, server.ErrAlreadyMember) {
			existing, findErr := s.memberRepo.FindByServerAndUser(ctx, serverID, userID)
			if findErr == nil && existing != nil {
				everyoneRole, roleErr := s.roleRepo.FindDefaultRole(ctx, serverID)
				if roleErr == nil && everyoneRole != nil {
					_ = s.memberRepo.AssignRole(ctx, existing.ID, everyoneRole.ID)
				}
			}
			return JoinResult{Joined: true}, nil
		}
		return JoinResult{}, err
	}

	// Assign @everyone role
	everyoneRole, err := s.roleRepo.FindDefaultRole(ctx, serverID)
	if err == nil && everyoneRole != nil {
		_ = s.memberRepo.AssignRole(ctx, member.ID, everyoneRole.ID)
	}

	if err := s.serverRepo.IncrementMemberCount(ctx, serverID, 1); err != nil {
		return JoinResult{}, err
	}

	return JoinResult{Joined: true}, nil
}

// Leave allows a user to leave a server.
func (s *Service) Leave(ctx context.Context, serverID, userID string) error {
	isMember, err := s.memberRepo.IsMember(ctx, serverID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return nil
	}

	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	// Owner cannot leave
	if srv.OwnerID == userID {
		return server.ErrOwnerCannotLeave
	}

	if err := s.memberRepo.Delete(ctx, serverID, userID); err != nil {
		if errors.Is(err, server.ErrNotMember) {
			return nil
		}
		return err
	}

	return s.serverRepo.IncrementMemberCount(ctx, serverID, -1)
}

// ListMembers lists all members of a server.
func (s *Service) ListMembers(ctx context.Context, serverID, userID string) ([]*server.Member, error) {
	isMember, err := s.memberRepo.IsMember(ctx, serverID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, server.ErrNotMember
	}

	return s.memberRepo.FindByServerID(ctx, serverID)
}

// RemoveMember removes a member from a server.
func (s *Service) RemoveMember(ctx context.Context, serverID, targetUserID, actorUserID string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	// Check permission: must have KickMembers permission or be owner
	if !s.canKickMembers(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	// Cannot kick owner
	if srv.OwnerID == targetUserID {
		return server.ErrNoPermission
	}

	if err := s.memberRepo.Delete(ctx, serverID, targetUserID); err != nil {
		return err
	}

	return s.serverRepo.IncrementMemberCount(ctx, serverID, -1)
}

// GetMemberWithRoles gets a member with their roles populated.
func (s *Service) GetMemberWithRoles(ctx context.Context, serverID, userID string) (*server.Member, error) {
	return s.memberRepo.FindByServerAndUserWithRoles(ctx, serverID, userID)
}

// ListRoles lists all roles in a server.
func (s *Service) ListRoles(ctx context.Context, serverID, userID string) ([]*server.Role, error) {
	isMember, err := s.memberRepo.IsMember(ctx, serverID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, server.ErrNotMember
	}

	return s.roleRepo.FindByServerID(ctx, serverID)
}

func (s *Service) ListJoinRequests(ctx context.Context, serverID, actorUserID string) ([]*server.JoinRequest, error) {
	if s.joinRequestRepo == nil {
		return nil, server.ErrNoPermission
	}

	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	if !s.canManageJoinRequests(ctx, srv, actorUserID) {
		return nil, server.ErrNoPermission
	}

	return s.joinRequestRepo.FindPendingByServerID(ctx, serverID)
}

func (s *Service) AcceptJoinRequest(ctx context.Context, serverID, targetUserID, actorUserID string) error {
	if s.joinRequestRepo == nil {
		return server.ErrNoPermission
	}

	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if !s.canManageJoinRequests(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	req, err := s.joinRequestRepo.FindByServerAndUser(ctx, serverID, targetUserID)
	if err != nil {
		return err
	}
	if req == nil || req.Status != server.JoinRequestStatusPending {
		return server.ErrJoinRequestNotFound
	}

	isMember, err := s.memberRepo.IsMember(ctx, serverID, targetUserID)
	if err != nil {
		return err
	}
	if isMember {
		return s.joinRequestRepo.UpdateStatus(ctx, serverID, targetUserID, server.JoinRequestStatusAccepted)
	}

	member := &server.Member{
		ID:       generateID("memb"),
		ServerID: serverID,
		UserID:   targetUserID,
		JoinedAt: time.Now(),
	}

	if err := s.memberRepo.Create(ctx, member); err != nil {
		if !errors.Is(err, server.ErrAlreadyMember) {
			return err
		}
		existing, findErr := s.memberRepo.FindByServerAndUser(ctx, serverID, targetUserID)
		if findErr == nil && existing != nil {
			member = existing
		}
	}

	everyoneRole, err := s.roleRepo.FindDefaultRole(ctx, serverID)
	if err == nil && everyoneRole != nil && member != nil {
		_ = s.memberRepo.AssignRole(ctx, member.ID, everyoneRole.ID)
	}

	if err := s.serverRepo.IncrementMemberCount(ctx, serverID, 1); err != nil {
		return err
	}

	return s.joinRequestRepo.UpdateStatus(ctx, serverID, targetUserID, server.JoinRequestStatusAccepted)
}

func (s *Service) RejectJoinRequest(ctx context.Context, serverID, targetUserID, actorUserID string) error {
	if s.joinRequestRepo == nil {
		return server.ErrNoPermission
	}

	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if !s.canManageJoinRequests(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	return s.joinRequestRepo.UpdateStatus(ctx, serverID, targetUserID, server.JoinRequestStatusRejected)
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

// canManageServer checks if a user can manage server settings.
func (s *Service) canManageServer(ctx context.Context, srv *server.Server, userID string) bool {
	// Owner can always manage
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageServer)
}

// canKickMembers checks if a user can kick members.
func (s *Service) canKickMembers(ctx context.Context, srv *server.Server, userID string) bool {
	// Owner can always kick
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionKickMembers)
}

func (s *Service) canManageJoinRequests(ctx context.Context, srv *server.Server, userID string) bool {
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageServer) || member.HasPermission(server.PermissionKickMembers)
}

// CanManageChannels checks if a user can manage channels - exported for use by other services.
func (s *Service) CanManageChannels(ctx context.Context, serverID, userID string) bool {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return false
	}

	// Owner can always manage
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, serverID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageChannels)
}

// IsOwner checks if a user is the server owner - exported for use by other services.
func (s *Service) IsOwner(ctx context.Context, serverID, userID string) bool {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return false
	}
	return srv.OwnerID == userID
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func generateID(prefix string) string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	if len(prefix) > 4 {
		prefix = prefix[:4]
	}
	return prefix + "_" + clean[:21]
}

func generateGradient() [2]string {
	gradients := [][2]string{
		{"#667eea", "#764ba2"},
		{"#ff6b6b", "#4ecdc4"},
		{"#a18cd1", "#fbc2eb"},
		{"#f093fb", "#f5576c"},
		{"#4facfe", "#00f2fe"},
		{"#43e97b", "#38f9d7"},
		{"#fa709a", "#fee140"},
		{"#30cfd0", "#330867"},
	}

	id := uuid.New()
	idx := int(id[0]) % len(gradients)
	return gradients[idx]
}
