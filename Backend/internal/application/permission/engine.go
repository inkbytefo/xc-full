// Package permission provides the core permission calculation engine.
// This implements Discord-style hierarchical permission resolution:
// 1. Base Permissions (from @everyone role)
// 2. Role Permissions (OR all assigned roles)
// 3. Category Overrides (if channel has parent)
// 4. Channel Overrides
// 5. Member-specific Overrides (highest priority)
package permission

import (
	"pink/internal/domain/channel"
	"pink/internal/domain/server"
)

// Engine calculates permissions for a member in a specific context.
type Engine struct{}

// NewEngine creates a new permission engine.
func NewEngine() *Engine {
	return &Engine{}
}

// CalculateInput contains all data needed to calculate permissions.
type CalculateInput struct {
	// The member whose permissions we're calculating
	Member *server.Member

	// All roles the member has (including @everyone)
	Roles []server.Role

	// The target channel (nil for server-level permissions)
	Channel *channel.Channel

	// The parent category (if channel has one)
	ParentCategory *channel.Channel

	// Overwrites on the category (if applicable)
	CategoryOverwrites []channel.PermissionOverwrite

	// Overwrites on the channel
	ChannelOverwrites []channel.PermissionOverwrite

	// Is this member the server owner?
	IsOwner bool
}

// Calculate computes the final permissions for a member.
func (e *Engine) Calculate(input CalculateInput) server.Permission {
	// Server owners have all permissions
	if input.IsOwner {
		return server.PermissionAll
	}

	// Step 1: Start with base permissions from all roles (OR them together)
	var perms server.Permission
	for _, role := range input.Roles {
		perms = perms.Add(role.Permissions)
	}

	// Administrator bypasses all further checks
	if perms.Has(server.PermissionAdministrator) {
		return server.PermissionAll
	}

	// If no channel specified, return server-level permissions
	if input.Channel == nil {
		return perms
	}

	// Step 2: Apply category overwrites (if channel has a parent category)
	if input.ParentCategory != nil && len(input.CategoryOverwrites) > 0 {
		perms = e.applyOverwrites(perms, input.CategoryOverwrites, input.Roles, input.Member.ID)
	}

	// Step 3: Apply channel overwrites
	if len(input.ChannelOverwrites) > 0 {
		perms = e.applyOverwrites(perms, input.ChannelOverwrites, input.Roles, input.Member.ID)
	}

	return perms
}

// applyOverwrites applies permission overwrites in the correct order:
// 1. @everyone role overwrite
// 2. Other role overwrites (in position order, lower first)
// 3. Member-specific overwrite (highest priority)
func (e *Engine) applyOverwrites(
	base server.Permission,
	overwrites []channel.PermissionOverwrite,
	roles []server.Role,
	memberID string,
) server.Permission {
	perms := base

	// Collect role IDs for quick lookup
	roleIDs := make(map[string]bool)
	var everyoneRoleID string
	for _, r := range roles {
		roleIDs[r.ID] = true
		if r.IsDefault {
			everyoneRoleID = r.ID
		}
	}

	// Phase 1: Apply @everyone role overwrite first
	for _, ow := range overwrites {
		if ow.TargetType == channel.OverwriteTargetRole && ow.TargetID == everyoneRoleID {
			perms = perms.Remove(ow.Deny)
			perms = perms.Add(ow.Allow)
			break
		}
	}

	// Phase 2: Apply other role overwrites
	var allow, deny server.Permission
	for _, ow := range overwrites {
		if ow.TargetType == channel.OverwriteTargetRole && ow.TargetID != everyoneRoleID {
			if roleIDs[ow.TargetID] {
				allow = allow.Add(ow.Allow)
				deny = deny.Add(ow.Deny)
			}
		}
	}
	perms = perms.Remove(deny)
	perms = perms.Add(allow)

	// Phase 3: Apply member-specific overwrite (highest priority)
	for _, ow := range overwrites {
		if ow.TargetType == channel.OverwriteTargetMember && ow.TargetID == memberID {
			perms = perms.Remove(ow.Deny)
			perms = perms.Add(ow.Allow)
			break
		}
	}

	return perms
}

// HasPermission is a convenience method to check a single permission.
func (e *Engine) HasPermission(input CalculateInput, perm server.Permission) bool {
	return e.Calculate(input).Has(perm)
}
