// Package server defines the Server domain entity and related types.
package server

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrNotFound          = errors.New("server not found")
	ErrAlreadyMember     = errors.New("already a member")
	ErrNotMember         = errors.New("not a member")
	ErrOwnerCannotLeave  = errors.New("owner cannot leave server")
	ErrNoPermission      = errors.New("no permission")
	ErrChannelNotFound   = errors.New("channel not found")
	ErrInvalidServerName = errors.New("invalid server name")
	ErrRoleNotFound      = errors.New("role not found")
)

// ============================================================================
// PERMISSION FLAGS (Bitwise - Discord-style)
// ============================================================================

// Permission represents a set of permission flags as a 64-bit integer.
type Permission int64

// Permission flags - each is a power of 2 for bitwise operations.
const (
	// General Server Permissions
	PermissionAdministrator  Permission = 1 << 0 // Full access, bypasses all checks
	PermissionManageServer   Permission = 1 << 1 // Edit server settings
	PermissionManageRoles    Permission = 1 << 2 // Create/edit/delete roles
	PermissionManageChannels Permission = 1 << 3 // Create/edit/delete channels
	PermissionKickMembers    Permission = 1 << 4 // Kick members from server
	PermissionBanMembers     Permission = 1 << 5 // Ban members from server
	PermissionInviteMembers  Permission = 1 << 6 // Create invites

	// Channel Permissions
	PermissionViewChannel     Permission = 1 << 10 // View channel and read messages
	PermissionSendMessages    Permission = 1 << 11 // Send messages in text channels
	PermissionManageMessages  Permission = 1 << 12 // Delete/pin others' messages
	PermissionEmbedLinks      Permission = 1 << 13 // Post embedded links
	PermissionAttachFiles     Permission = 1 << 14 // Upload files
	PermissionMentionEveryone Permission = 1 << 15 // Use @everyone, @here

	// Voice Permissions
	PermissionConnect       Permission = 1 << 20 // Connect to voice channels
	PermissionSpeak         Permission = 1 << 21 // Speak in voice channels
	PermissionVideo         Permission = 1 << 22 // Use video
	PermissionMuteMembers   Permission = 1 << 23 // Mute others in voice
	PermissionDeafenMembers Permission = 1 << 24 // Deafen others in voice
	PermissionMoveMembers   Permission = 1 << 25 // Move members between voice channels

	// Default permissions for @everyone role
	PermissionDefaultEveryone = PermissionViewChannel | PermissionSendMessages | PermissionConnect | PermissionSpeak | PermissionVideo

	// All permissions
	PermissionAll = PermissionAdministrator | PermissionManageServer | PermissionManageRoles |
		PermissionManageChannels | PermissionKickMembers | PermissionBanMembers | PermissionInviteMembers |
		PermissionViewChannel | PermissionSendMessages | PermissionManageMessages |
		PermissionEmbedLinks | PermissionAttachFiles | PermissionMentionEveryone |
		PermissionConnect | PermissionSpeak | PermissionVideo |
		PermissionMuteMembers | PermissionDeafenMembers | PermissionMoveMembers
)

// Has checks if the permission set has a specific permission.
func (p Permission) Has(perm Permission) bool {
	// Administrator bypasses all checks
	if p&PermissionAdministrator != 0 {
		return true
	}
	return p&perm == perm
}

// Add adds a permission to the set.
func (p Permission) Add(perm Permission) Permission {
	return p | perm
}

// Remove removes a permission from the set.
func (p Permission) Remove(perm Permission) Permission {
	return p &^ perm
}

// ============================================================================
// SERVER ENTITY
// ============================================================================

// Server represents a server entity in the domain.
type Server struct {
	ID           string
	Name         string
	Description  string
	IconGradient [2]string
	OwnerID      string
	MemberCount  int
	IsPublic     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// ============================================================================
// ROLE ENTITY (RBAC 2.0)
// ============================================================================

// Role represents a server role with permissions.
type Role struct {
	ID            string
	ServerID      string
	Name          string
	Color         string     // Hex color code
	Position      int        // Higher = more power
	Permissions   Permission // Bitwise permission flags
	IsDefault     bool       // Is this the @everyone role?
	IsMentionable bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// ============================================================================
// MEMBER ENTITY (Updated for RBAC 2.0)
// ============================================================================

// Member represents a server member with roles.
type Member struct {
	ID       string
	ServerID string
	UserID   string
	Nickname string
	JoinedAt time.Time
	Roles    []Role // Populated when needed
}

// GetPermissions calculates the combined permissions from all roles.
func (m *Member) GetPermissions() Permission {
	var perms Permission
	for _, role := range m.Roles {
		perms = perms.Add(role.Permissions)
	}
	return perms
}

// HasPermission checks if the member has a specific permission.
func (m *Member) HasPermission(perm Permission) bool {
	return m.GetPermissions().Has(perm)
}

// MemberRole is kept for backward compatibility but deprecated for new code.
// Deprecated: Use Role entity instead.
type MemberRole string

const (
	RoleOwner     MemberRole = "owner"
	RoleAdmin     MemberRole = "admin"
	RoleModerator MemberRole = "moderator"
	RoleMember    MemberRole = "member"
)

// CanManageChannels checks if the role can manage channels.
// Deprecated: Use Permission.Has(PermissionManageChannels) instead.
func (r MemberRole) CanManageChannels() bool {
	return r == RoleOwner || r == RoleAdmin
}

// CanManageMembers checks if the role can manage members.
// Deprecated: Use Permission.Has(PermissionKickMembers) instead.
func (r MemberRole) CanManageMembers() bool {
	return r == RoleOwner || r == RoleAdmin || r == RoleModerator
}

// CanDeleteServer checks if the role can delete the server.
// Deprecated: Use ownership check instead.
func (r MemberRole) CanDeleteServer() bool {
	return r == RoleOwner
}
