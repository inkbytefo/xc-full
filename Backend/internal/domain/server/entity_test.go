package server

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Permission Tests
// =============================================================================

func TestPermission_Has(t *testing.T) {
	tests := []struct {
		name     string
		perms    Permission
		check    Permission
		expected bool
	}{
		{
			name:     "has single permission",
			perms:    PermissionSendMessages,
			check:    PermissionSendMessages,
			expected: true,
		},
		{
			name:     "does not have permission",
			perms:    PermissionSendMessages,
			check:    PermissionManageChannels,
			expected: false,
		},
		{
			name:     "administrator bypasses all",
			perms:    PermissionAdministrator,
			check:    PermissionManageChannels,
			expected: true,
		},
		{
			name:     "combined permissions",
			perms:    PermissionSendMessages | PermissionManageChannels,
			check:    PermissionManageChannels,
			expected: true,
		},
		{
			name:     "default everyone has view channel",
			perms:    PermissionDefaultEveryone,
			check:    PermissionViewChannel,
			expected: true,
		},
		{
			name:     "default everyone cannot manage server",
			perms:    PermissionDefaultEveryone,
			check:    PermissionManageServer,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.perms.Has(tt.check)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestPermission_Add(t *testing.T) {
	tests := []struct {
		name     string
		initial  Permission
		add      Permission
		expected Permission
	}{
		{
			name:     "add single permission",
			initial:  0,
			add:      PermissionSendMessages,
			expected: PermissionSendMessages,
		},
		{
			name:     "add to existing",
			initial:  PermissionSendMessages,
			add:      PermissionManageChannels,
			expected: PermissionSendMessages | PermissionManageChannels,
		},
		{
			name:     "add duplicate is idempotent",
			initial:  PermissionSendMessages,
			add:      PermissionSendMessages,
			expected: PermissionSendMessages,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.initial.Add(tt.add)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestPermission_Remove(t *testing.T) {
	tests := []struct {
		name     string
		initial  Permission
		remove   Permission
		expected Permission
	}{
		{
			name:     "remove existing permission",
			initial:  PermissionSendMessages | PermissionManageChannels,
			remove:   PermissionManageChannels,
			expected: PermissionSendMessages,
		},
		{
			name:     "remove non-existing is noop",
			initial:  PermissionSendMessages,
			remove:   PermissionManageChannels,
			expected: PermissionSendMessages,
		},
		{
			name:     "remove all",
			initial:  PermissionSendMessages,
			remove:   PermissionSendMessages,
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.initial.Remove(tt.remove)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// Member Tests
// =============================================================================

func TestMember_IsTimedOut(t *testing.T) {
	now := time.Now()
	futureTime := now.Add(1 * time.Hour)
	pastTime := now.Add(-1 * time.Hour)

	tests := []struct {
		name     string
		member   *Member
		expected bool
	}{
		{
			name:     "not timed out - nil",
			member:   &Member{CommunicationDisabledUntil: nil},
			expected: false,
		},
		{
			name:     "timed out - future",
			member:   &Member{CommunicationDisabledUntil: &futureTime},
			expected: true,
		},
		{
			name:     "timeout expired - past",
			member:   &Member{CommunicationDisabledUntil: &pastTime},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.member.IsTimedOut()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMember_GetPermissions(t *testing.T) {
	tests := []struct {
		name     string
		roles    []Role
		expected Permission
	}{
		{
			name:     "no roles",
			roles:    []Role{},
			expected: 0,
		},
		{
			name: "single role",
			roles: []Role{
				{Permissions: PermissionSendMessages},
			},
			expected: PermissionSendMessages,
		},
		{
			name: "multiple roles combine",
			roles: []Role{
				{Permissions: PermissionSendMessages},
				{Permissions: PermissionManageChannels},
			},
			expected: PermissionSendMessages | PermissionManageChannels,
		},
		{
			name: "admin role grants all",
			roles: []Role{
				{Permissions: PermissionAdministrator},
			},
			expected: PermissionAdministrator,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			member := &Member{Roles: tt.roles}
			result := member.GetPermissions()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMember_HasPermission(t *testing.T) {
	tests := []struct {
		name     string
		roles    []Role
		check    Permission
		expected bool
	}{
		{
			name: "has permission through role",
			roles: []Role{
				{Permissions: PermissionManageChannels},
			},
			check:    PermissionManageChannels,
			expected: true,
		},
		{
			name: "admin has all permissions",
			roles: []Role{
				{Permissions: PermissionAdministrator},
			},
			check:    PermissionBanMembers,
			expected: true,
		},
		{
			name: "missing permission",
			roles: []Role{
				{Permissions: PermissionSendMessages},
			},
			check:    PermissionManageChannels,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			member := &Member{Roles: tt.roles}
			result := member.HasPermission(tt.check)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// MemberRole Tests (Deprecated but still in use)
// =============================================================================

func TestMemberRole_CanManageChannels(t *testing.T) {
	tests := []struct {
		role     MemberRole
		expected bool
	}{
		{RoleOwner, true},
		{RoleAdmin, true},
		{RoleModerator, false},
		{RoleMember, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.role.CanManageChannels())
		})
	}
}

func TestMemberRole_CanManageMembers(t *testing.T) {
	tests := []struct {
		role     MemberRole
		expected bool
	}{
		{RoleOwner, true},
		{RoleAdmin, true},
		{RoleModerator, true},
		{RoleMember, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.role.CanManageMembers())
		})
	}
}

func TestMemberRole_CanDeleteServer(t *testing.T) {
	tests := []struct {
		role     MemberRole
		expected bool
	}{
		{RoleOwner, true},
		{RoleAdmin, false},
		{RoleModerator, false},
		{RoleMember, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.role.CanDeleteServer())
		})
	}
}
