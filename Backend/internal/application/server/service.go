// Package server provides server-related application services.
package server

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"regexp"
	"strings"

	"github.com/google/uuid"

	channelDomain "xcord/internal/domain/channel"
	"xcord/internal/domain/server"
	"xcord/internal/pkg/id"
	"xcord/internal/pkg/validation"
)

// Service provides server-related operations.
type Service struct {
	serverRepo      server.Repository
	memberRepo      server.MemberRepository
	roleRepo        server.RoleRepository
	channelRepo     channelDomain.Repository
	joinRequestRepo server.JoinRequestRepository
	banRepo         server.BanRepository
	auditRepo       server.AuditLogRepository
}

// NewService creates a new server service.
func NewService(
	serverRepo server.Repository,
	memberRepo server.MemberRepository,
	roleRepo server.RoleRepository,
	channelRepo channelDomain.Repository,
	joinRequestRepo server.JoinRequestRepository,
	banRepo server.BanRepository,
	auditRepo server.AuditLogRepository,
) *Service {
	return &Service{
		serverRepo:      serverRepo,
		memberRepo:      memberRepo,
		roleRepo:        roleRepo,
		channelRepo:     channelRepo,
		joinRequestRepo: joinRequestRepo,
		banRepo:         banRepo,
		auditRepo:       auditRepo,
	}
}

// CreateCommand represents a server creation request.
type CreateCommand struct {
	Name         string
	Description  string
	OwnerID      string
	IsPublic     bool
	IconGradient [2]string // Optional: custom icon gradient colors
}

// Create creates a new server.
func (s *Service) Create(ctx context.Context, cmd CreateCommand) (*server.Server, error) {
	now := time.Now()

	// Use provided icon gradient or generate a random one
	iconGradient := cmd.IconGradient
	if iconGradient[0] == "" || iconGradient[1] == "" {
		iconGradient = generateGradient()
	}

	srv := &server.Server{
		ID:           id.Generate("serv"),
		Handle:       generateHandle(cmd.Name),
		Name:         cmd.Name,
		Description:  cmd.Description,
		IconGradient: iconGradient,
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
		ID:          id.Generate("role"),
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
		ID:       id.Generate("memb"),
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
		ID:        id.Generate("chan"),
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

// GetByHandle retrieves a server by handle.
func (s *Service) GetByHandle(ctx context.Context, handle, userID string) (*server.Server, error) {
	srv, err := s.serverRepo.FindByHandle(ctx, handle)
	if err != nil {
		return nil, err
	}

	// Check if public or user is member
	if !srv.IsPublic {
		isMember, err := s.memberRepo.IsMember(ctx, srv.ID, userID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, server.ErrNotFound
		}
	}

	return srv, nil
}

func generateHandle(name string) string {
	// Simple slugify
	reg := regexp.MustCompile("[^a-z0-9]+")
	slug := reg.ReplaceAllString(strings.ToLower(name), "-")
	slug = strings.Trim(slug, "-")

	if len(slug) < 3 {
		slug = "server-" + id.Generate("")[0:6]
	}

	// Ensure max length
	if len(slug) > 30 {
		slug = slug[:30]
	}

	// Add random suffix to reduce collision probability (for now)
	// In a real app we'd check availability
	slug = slug + "-" + id.Generate("")[len(id.Generate(""))-4:]

	// Final validation check
	if err := validation.ValidateHandle(slug); err != nil {
		// If still invalid (e.g. reserved word + suffix is still reserved?? unlikely), fallback to purely random
		return "server-" + id.Generate("serv")[0:8]
	}

	return slug
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
			ServerID:  serverID,
			UserID:    userID,
			Status:    server.JoinRequestStatusPending,
			Message:   "",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := s.joinRequestRepo.Create(ctx, req); err != nil {
			return JoinResult{}, err
		}

		return JoinResult{Pending: true}, nil
	}

	// Check if banned
	if s.banRepo != nil {
		isBanned, err := s.banRepo.IsBanned(ctx, serverID, userID)
		if err == nil && isBanned {
			return JoinResult{}, server.ErrNoPermission // Or specific ErrBanned
		}
	}

	member := &server.Member{
		ID:       id.Generate("memb"),
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
		ID:       id.Generate("memb"),
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

// BanMember bans a member from the server.
func (s *Service) BanMember(ctx context.Context, serverID, targetUserID, actorUserID, reason string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	// Permission Check
	if !s.canBanMembers(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	// Cannot ban owner
	if srv.OwnerID == targetUserID {
		return server.ErrNoPermission
	}

	// 1. Create Ban Record
	ban := &server.Ban{
		ID:        id.Generate("ban"),
		ServerID:  serverID,
		UserID:    targetUserID,
		BannedBy:  actorUserID,
		Reason:    reason,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.banRepo.Create(ctx, ban); err != nil {
		return err
	}

	// 2. Remove Member (if they are currently in the server)
	isMember, err := s.memberRepo.IsMember(ctx, serverID, targetUserID)
	if err == nil && isMember {
		if err := s.memberRepo.Delete(ctx, serverID, targetUserID); err != nil {
			slog.Warn("failed to remove banned member", slog.Any("error", err))
		} else {
			_ = s.serverRepo.IncrementMemberCount(ctx, serverID, -1)
		}
	}

	// 3. Create Audit Log
	_ = s.logAudit(ctx, serverID, actorUserID, targetUserID, server.AuditLogActionMemberBan, map[string]interface{}{
		"reason": reason,
	})

	return nil
}

// UnbanMember removes a ban.
func (s *Service) UnbanMember(ctx context.Context, serverID, targetUserID, actorUserID string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if !s.canBanMembers(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	if err := s.banRepo.Delete(ctx, serverID, targetUserID); err != nil {
		return err
	}

	// Audit Log
	_ = s.logAudit(ctx, serverID, actorUserID, targetUserID, server.AuditLogActionMemberUnban, nil)

	return nil
}

// GetBans returns all bans for a server.
func (s *Service) GetBans(ctx context.Context, serverID, actorUserID string) ([]*server.Ban, error) {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	if !s.canBanMembers(ctx, srv, actorUserID) {
		return nil, server.ErrNoPermission
	}

	return s.banRepo.FindByServerID(ctx, serverID)
}

// TimeoutMember timeouts a member.
func (s *Service) TimeoutMember(ctx context.Context, serverID, targetUserID, actorUserID string, duration time.Duration, reason string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	// Check permission (needs MuteMembers or ManageMembers/KickMembers depending on policy, utilizing MuteMembers for now)
	// Adapting to use KickMembers as a proxy for "Mod" powers if MuteMembers is exclusively voice.
	// Ideally we use PermissionMuteMembers if we map it to general "Timeout". Let's use PermissionKickMembers as a baseline for "Mod".
	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, actorUserID)
	if err != nil {
		return server.ErrNoPermission
	}

	// Check if actor has KickMembers OR MuteMembers (Voice)
	if !member.HasPermission(server.PermissionKickMembers) && !member.HasPermission(server.PermissionMuteMembers) && srv.OwnerID != actorUserID {
		return server.ErrNoPermission
	}

	if srv.OwnerID == targetUserID {
		return server.ErrNoPermission
	}

	targetMember, err := s.memberRepo.FindByServerAndUser(ctx, serverID, targetUserID)
	if err != nil {
		return err
	}

	until := time.Now().Add(duration)
	targetMember.CommunicationDisabledUntil = &until

	if err := s.memberRepo.Update(ctx, targetMember); err != nil {
		return err
	}

	_ = s.logAudit(ctx, serverID, actorUserID, targetUserID, server.AuditLogActionMemberTimeout, map[string]interface{}{
		"duration": duration.String(),
		"until":    until,
		"reason":   reason,
	})

	return nil
}

// RemoveTimeout removes a timeout.
func (s *Service) RemoveTimeout(ctx context.Context, serverID, targetUserID, actorUserID string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, actorUserID)
	if err != nil {
		return server.ErrNoPermission
	}

	if !member.HasPermission(server.PermissionKickMembers) && !member.HasPermission(server.PermissionMuteMembers) && srv.OwnerID != actorUserID {
		return server.ErrNoPermission
	}

	targetMember, err := s.memberRepo.FindByServerAndUser(ctx, serverID, targetUserID)
	if err != nil {
		return err
	}

	targetMember.CommunicationDisabledUntil = nil

	if err := s.memberRepo.Update(ctx, targetMember); err != nil {
		return err
	}

	_ = s.logAudit(ctx, serverID, actorUserID, targetUserID, server.AuditLogActionTimeoutRemove, nil)

	return nil
}

// CreateRole creates a new role.
func (s *Service) CreateRole(ctx context.Context, serverID, name, color string, permissions server.Permission, actorUserID string) (*server.Role, error) {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	if !s.canManageRoles(ctx, srv, actorUserID) {
		return nil, server.ErrNoPermission
	}

	// Determine position: find max existing position + 1
	roles, err := s.roleRepo.FindByServerID(ctx, serverID)
	if err != nil {
		return nil, err
	}
	position := 1
	if len(roles) > 0 {
		position = roles[0].Position + 1
	}

	role := &server.Role{
		ID:            id.Generate("role"),
		ServerID:      serverID,
		Name:          name,
		Color:         color,
		Position:      position,
		Permissions:   permissions,
		IsDefault:     false,
		IsMentionable: true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.roleRepo.Create(ctx, role); err != nil {
		return nil, err
	}

	_ = s.logAudit(ctx, serverID, actorUserID, role.ID, server.AuditLogActionRoleCreate, map[string]interface{}{
		"name":        name,
		"permissions": permissions,
	})

	return role, nil
}

// UpdateRole updates an existing role.
func (s *Service) UpdateRole(ctx context.Context, serverID, roleID, name, color string, permissions *server.Permission, position *int, actorUserID string) (*server.Role, error) {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	if !s.canManageRoles(ctx, srv, actorUserID) {
		return nil, server.ErrNoPermission
	}

	role, err := s.roleRepo.FindByID(ctx, roleID)
	if err != nil {
		return nil, err
	}

	if role.ServerID != serverID {
		return nil, server.ErrRoleNotFound
	}

	// Prevent editing restricted roles (like @everyone) if we enforce logic there (e.g. can't change position or name of @everyone)
	if role.IsDefault {
		// Example check: maybe allow changing permissions but not name
	}

	changes := make(map[string]interface{})

	if name != "" {
		changes["name_old"] = role.Name
		role.Name = name
		changes["name_new"] = name
	}
	if color != "" {
		changes["color_old"] = role.Color
		role.Color = color
		changes["color_new"] = color
	}
	if permissions != nil {
		changes["permissions_old"] = role.Permissions
		role.Permissions = *permissions
		changes["permissions_new"] = *permissions
	}
	if position != nil {
		changes["position_old"] = role.Position
		role.Position = *position
		changes["position_new"] = *position
	}

	role.UpdatedAt = time.Now()

	if err := s.roleRepo.Update(ctx, role); err != nil {
		return nil, err
	}

	_ = s.logAudit(ctx, serverID, actorUserID, role.ID, server.AuditLogActionRoleUpdate, changes)

	return role, nil
}

// DeleteRole deletes a role.
func (s *Service) DeleteRole(ctx context.Context, serverID, roleID, actorUserID string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if !s.canManageRoles(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	role, err := s.roleRepo.FindByID(ctx, roleID)
	if err != nil {
		return err
	}

	if role.ServerID != serverID {
		return server.ErrRoleNotFound
	}

	if role.IsDefault {
		return errors.New("cannot delete default role")
	}

	if err := s.roleRepo.Delete(ctx, roleID); err != nil {
		return err
	}

	_ = s.logAudit(ctx, serverID, actorUserID, roleID, server.AuditLogActionRoleDelete, nil)

	return nil
}

// UpdateMemberRoles updates a member's roles.
func (s *Service) UpdateMemberRoles(ctx context.Context, serverID, targetUserID string, roleIDs []string, actorUserID string) error {
	srv, err := s.serverRepo.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if !s.canManageRoles(ctx, srv, actorUserID) {
		return server.ErrNoPermission
	}

	// 1. Get member's current roles
	currentRoles, err := s.roleRepo.FindByMemberID(ctx, memberID(ctx, s, serverID, targetUserID))
	if err != nil {
		return err
	}

	// 2. Identify roles to add and remove
	// (Simplification: Remove all existing non-default roles, then add new ones)
	// IMPORTANT: Don't remove the default role (@everyone) if it's not in the list, or ensure it's always in the list.
	// Best practice: The list should contain ALL roles the user should have. Use this as "Set" operation.

	member, err := s.memberRepo.FindByServerAndUser(ctx, serverID, targetUserID)
	if err != nil {
		return err
	}

	defaultRole, _ := s.roleRepo.FindDefaultRole(ctx, serverID)

	// Remove all currently assigned roles (except maybe default, but let's just handle IDs cleanly)
	for _, r := range currentRoles {
		if r.IsDefault {
			continue // Don't touch default role
		}
		_ = s.memberRepo.RemoveRole(ctx, member.ID, r.ID)
	}

	// Add new roles
	for _, rid := range roleIDs {
		// Skip adding default role explicitly if we treat it as auto-assigned,
		// but checking if it's valid role is good.
		r, err := s.roleRepo.FindByID(ctx, rid)
		if err != nil {
			continue
		}
		if r.ServerID != serverID {
			continue
		}
		_ = s.memberRepo.AssignRole(ctx, member.ID, rid)
	}

	// Ensure default role is assigned
	if defaultRole != nil {
		_ = s.memberRepo.AssignRole(ctx, member.ID, defaultRole.ID)
	}

	_ = s.logAudit(ctx, serverID, actorUserID, targetUserID, server.AuditLogActionMemberTimeout, map[string]interface{}{
		"action": "update_roles",
		"roles":  roleIDs,
	})

	return nil
}

// helper to get member ID from User ID
func memberID(ctx context.Context, s *Service, serverID, userID string) string {
	m, _ := s.memberRepo.FindByServerAndUser(ctx, serverID, userID)
	if m != nil {
		return m.ID
	}
	return ""
}

func (s *Service) logAudit(ctx context.Context, serverID, actorID, targetID string, action server.AuditLogAction, changes map[string]interface{}) error {
	log := &server.AuditLog{
		ID:         id.Generate("audi"),
		ServerID:   serverID,
		ActorID:    actorID,
		TargetID:   targetID,
		ActionType: action,
		Changes:    changes,
		CreatedAt:  time.Now(),
	}
	return s.auditRepo.Create(ctx, log)
}

func (s *Service) IsTimedOut(ctx context.Context, serverID, userID string) bool {
	member, err := s.memberRepo.FindByServerAndUser(ctx, serverID, userID)
	if err != nil {
		return false
	}
	return member.IsTimedOut()
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

// canManageServer checks if a user can manage server settings.
// canManageRoles checks if a user can manage roles.
func (s *Service) canManageRoles(ctx context.Context, srv *server.Server, userID string) bool {
	// Owner can always manage roles
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionManageRoles)
}

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

// canBanMembers checks if a user can ban members.
func (s *Service) canBanMembers(ctx context.Context, srv *server.Server, userID string) bool {
	// Owner can always ban
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionBanMembers)
}

// canMuteMembers checks if a user can mute members.
func (s *Service) canMuteMembers(ctx context.Context, srv *server.Server, userID string) bool {
	// Owner can always mute
	if srv.OwnerID == userID {
		return true
	}

	member, err := s.memberRepo.FindByServerAndUserWithRoles(ctx, srv.ID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionMuteMembers)
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
