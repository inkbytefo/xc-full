package server

import "context"

// Repository defines the interface for server data access.
type Repository interface {
	// FindByID finds a server by its ID.
	FindByID(ctx context.Context, id string) (*Server, error)

	// FindByHandle finds a server by its handle.
	FindByHandle(ctx context.Context, handle string) (*Server, error)

	// FindByUserID finds all servers a user is a member of.
	FindByUserID(ctx context.Context, userID string) ([]*Server, error)

	// Create creates a new server.
	Create(ctx context.Context, server *Server) error

	// Update updates an existing server.
	Update(ctx context.Context, server *Server) error

	// Delete deletes a server by its ID.
	Delete(ctx context.Context, id string) error

	// IncrementMemberCount increments the member count.
	IncrementMemberCount(ctx context.Context, id string, delta int) error
}

// MemberRepository defines the interface for server member data access.
type MemberRepository interface {
	// FindByServerID finds all members of a server.
	FindByServerID(ctx context.Context, serverID string) ([]*Member, error)

	// FindByServerAndUser finds a member by server and user ID.
	FindByServerAndUser(ctx context.Context, serverID, userID string) (*Member, error)

	// FindByServerAndUserWithRoles finds a member with all their roles populated.
	FindByServerAndUserWithRoles(ctx context.Context, serverID, userID string) (*Member, error)

	// Create adds a member to a server.
	Create(ctx context.Context, member *Member) error

	// Update updates an existing member.
	Update(ctx context.Context, member *Member) error

	// Delete removes a member from a server.
	Delete(ctx context.Context, serverID, userID string) error

	// AssignRole assigns a role to a member.
	AssignRole(ctx context.Context, memberID, roleID string) error

	// RemoveRole removes a role from a member.
	RemoveRole(ctx context.Context, memberID, roleID string) error

	// IsMember checks if a user is a member of a server.
	IsMember(ctx context.Context, serverID, userID string) (bool, error)
}

// RoleRepository defines the interface for server role data access.
type RoleRepository interface {
	// FindByID finds a role by its ID.
	FindByID(ctx context.Context, id string) (*Role, error)

	// FindByServerID finds all roles of a server.
	FindByServerID(ctx context.Context, serverID string) ([]*Role, error)

	// FindDefaultRole finds the @everyone role for a server.
	FindDefaultRole(ctx context.Context, serverID string) (*Role, error)

	// FindByMemberID finds all roles assigned to a member.
	FindByMemberID(ctx context.Context, memberID string) ([]*Role, error)

	// Create creates a new role.
	Create(ctx context.Context, role *Role) error

	// Update updates an existing role.
	Update(ctx context.Context, role *Role) error

	// Delete deletes a role by its ID.
	Delete(ctx context.Context, id string) error

	// UpdatePositions updates the positions of multiple roles (for reordering).
	UpdatePositions(ctx context.Context, serverID string, positions map[string]int) error
}

type JoinRequestRepository interface {
	Create(ctx context.Context, req *JoinRequest) error
	UpdateStatus(ctx context.Context, serverID, userID string, status JoinRequestStatus) error
	Delete(ctx context.Context, serverID, userID string) error
	FindByServerAndUser(ctx context.Context, serverID, userID string) (*JoinRequest, error)
	FindPendingByServerID(ctx context.Context, serverID string) ([]*JoinRequest, error)
}

// BanRepository defines the interface for server bans.
type BanRepository interface {
	Create(ctx context.Context, ban *Ban) error
	Delete(ctx context.Context, serverID, userID string) error
	Find(ctx context.Context, serverID, userID string) (*Ban, error)
	FindByServerID(ctx context.Context, serverID string) ([]*Ban, error)
	IsBanned(ctx context.Context, serverID, userID string) (bool, error)
}

// AuditLogRepository defines the interface for audit logs.
type AuditLogRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	FindByServerID(ctx context.Context, serverID string, limit, offset int) ([]*AuditLog, error)
}
