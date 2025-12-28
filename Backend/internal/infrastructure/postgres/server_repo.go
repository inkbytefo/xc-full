package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/server"
)

// ServerRepository implements server.Repository using PostgreSQL.
type ServerRepository struct {
	pool *pgxpool.Pool
}

// NewServerRepository creates a new ServerRepository.
func NewServerRepository(pool *pgxpool.Pool) *ServerRepository {
	return &ServerRepository{pool: pool}
}

// FindByID finds a server by its ID.
func (r *ServerRepository) FindByID(ctx context.Context, id string) (*server.Server, error) {
	query := `
		SELECT id, name, description, icon_gradient, owner_id, 
		       member_count, is_public, created_at, updated_at, handle, tag
		FROM servers
		WHERE id = $1
	`

	var s server.Server
	var gradient []string
	var desc *string
	var tag *string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&s.ID,
		&s.Name,
		&desc,
		&gradient,
		&s.OwnerID,
		&s.MemberCount,
		&s.IsPublic,
		&s.CreatedAt,
		&s.UpdatedAt,
		&s.Handle,
		&tag,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, server.ErrNotFound
		}
		return nil, fmt.Errorf("query server by id: %w", err)
	}

	if len(gradient) >= 2 {
		s.IconGradient = [2]string{gradient[0], gradient[1]}
	}
	if desc != nil {
		s.Description = *desc
	}
	if tag != nil {
		s.Tag = *tag
	}

	return &s, nil
}

// FindByHandle finds a server by its handle.
func (r *ServerRepository) FindByHandle(ctx context.Context, handle string) (*server.Server, error) {
	query := `
		SELECT id, name, description, icon_gradient, owner_id, 
		       member_count, is_public, created_at, updated_at, handle, tag
		FROM servers
		WHERE handle = $1
	`

	var s server.Server
	var gradient []string
	var desc *string
	var tag *string

	err := r.pool.QueryRow(ctx, query, handle).Scan(
		&s.ID,
		&s.Name,
		&desc,
		&gradient,
		&s.OwnerID,
		&s.MemberCount,
		&s.IsPublic,
		&s.CreatedAt,
		&s.UpdatedAt,
		&s.Handle,
		&tag,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, server.ErrNotFound
		}
		return nil, fmt.Errorf("query server by handle: %w", err)
	}

	if len(gradient) >= 2 {
		s.IconGradient = [2]string{gradient[0], gradient[1]}
	}
	if desc != nil {
		s.Description = *desc
	}
	if tag != nil {
		s.Tag = *tag
	}

	return &s, nil
}

// FindByUserID finds all servers a user is a member of.
func (r *ServerRepository) FindByUserID(ctx context.Context, userID string) ([]*server.Server, error) {
	query := `
		SELECT s.id, s.name, s.description, s.icon_gradient, s.owner_id, 
		       s.member_count, s.is_public, s.created_at, s.updated_at, s.handle, s.tag
		FROM servers s
		INNER JOIN server_members sm ON s.id = sm.server_id
		WHERE sm.user_id = $1
		ORDER BY s.name
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query servers by user id: %w", err)
	}
	defer rows.Close()

	var servers []*server.Server
	for rows.Next() {
		var s server.Server
		var gradient []string
		var desc *string
		var tag *string

		err := rows.Scan(
			&s.ID,
			&s.Name,
			&desc,
			&gradient,
			&s.OwnerID,
			&s.MemberCount,
			&s.IsPublic,
			&s.CreatedAt,
			&s.UpdatedAt,
			&s.Handle,
			&tag,
		)
		if err != nil {
			return nil, fmt.Errorf("scan server: %w", err)
		}

		if len(gradient) >= 2 {
			s.IconGradient = [2]string{gradient[0], gradient[1]}
		}
		if desc != nil {
			s.Description = *desc
		}
		if tag != nil {
			s.Tag = *tag
		}

		servers = append(servers, &s)
	}

	return servers, nil
}

// Create creates a new server.
func (r *ServerRepository) Create(ctx context.Context, s *server.Server) error {
	query := `
		INSERT INTO servers (
			id, name, description, icon_gradient, owner_id,
			member_count, is_public, created_at, updated_at, handle, tag
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	var desc *string
	if s.Description != "" {
		desc = &s.Description
	}

	var tag *string
	if s.Tag != "" {
		tag = &s.Tag
	}

	_, err := r.pool.Exec(ctx, query,
		s.ID,
		s.Name,
		desc,
		s.IconGradient[:],
		s.OwnerID,
		s.MemberCount,
		s.IsPublic,
		s.CreatedAt,
		s.UpdatedAt,
		s.Handle,
		tag,
	)

	if err != nil {
		return fmt.Errorf("insert server: %w", err)
	}

	return nil
}

// Update updates an existing server.
func (r *ServerRepository) Update(ctx context.Context, s *server.Server) error {
	query := `
		UPDATE servers SET
			name = $2,
			description = $3,
			icon_gradient = $4,
			is_public = $5,
			tag = $6,
			updated_at = NOW()
		WHERE id = $1
	`

	var desc *string
	if s.Description != "" {
		desc = &s.Description
	}

	var tag *string
	if s.Tag != "" {
		tag = &s.Tag
	}

	result, err := r.pool.Exec(ctx, query,
		s.ID,
		s.Name,
		desc,
		s.IconGradient[:],
		s.IsPublic,
		tag,
	)

	if err != nil {
		return fmt.Errorf("update server: %w", err)
	}

	if result.RowsAffected() == 0 {
		return server.ErrNotFound
	}

	return nil
}

// Delete deletes a server by its ID.
func (r *ServerRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM servers WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete server: %w", err)
	}

	if result.RowsAffected() == 0 {
		return server.ErrNotFound
	}

	return nil
}

// IncrementMemberCount increments the member count.
func (r *ServerRepository) IncrementMemberCount(ctx context.Context, id string, delta int) error {
	query := `UPDATE servers SET member_count = member_count + $2 WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id, delta)
	if err != nil {
		return fmt.Errorf("increment member count: %w", err)
	}

	return nil
}

// ============================================================================
// MEMBER REPOSITORY (Updated for RBAC 2.0)
// ============================================================================

// MemberRepository implements server.MemberRepository using PostgreSQL.
type MemberRepository struct {
	pool *pgxpool.Pool
}

// NewMemberRepository creates a new MemberRepository.
func NewMemberRepository(pool *pgxpool.Pool) *MemberRepository {
	return &MemberRepository{pool: pool}
}

// FindByServerID finds all members of a server.
func (r *MemberRepository) FindByServerID(ctx context.Context, serverID string) ([]*server.Member, error) {
	query := `
		SELECT
			m.id, m.server_id, m.user_id, m.nickname, m.joined_at, m.communication_disabled_until,
			r.id, r.server_id, r.name, r.color, r.position,
			r.permissions, r.is_default, r.is_mentionable, r.created_at, r.updated_at
		FROM server_members m
		LEFT JOIN member_roles mr ON mr.member_id = m.id
		LEFT JOIN roles r ON r.id = mr.role_id
		WHERE m.server_id = $1
		ORDER BY m.joined_at, r.position DESC
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query members by server id: %w", err)
	}
	defer rows.Close()

	membersByID := make(map[string]*server.Member)
	var members []*server.Member
	for rows.Next() {
		var nickname *string
		var memberID string
		var srvID string
		var userID string
		var joinedAt time.Time
		var commDisabledUntil *time.Time

		var roleID *string
		var roleServerID *string
		var roleName *string
		var roleColor *string
		var rolePosition *int
		var rolePermissions *int64
		var roleIsDefault *bool
		var roleIsMentionable *bool
		var roleCreatedAt *time.Time
		var roleUpdatedAt *time.Time

		err := rows.Scan(
			&memberID, &srvID, &userID, &nickname, &joinedAt, &commDisabledUntil,
			&roleID, &roleServerID, &roleName, &roleColor, &rolePosition,
			&rolePermissions, &roleIsDefault, &roleIsMentionable, &roleCreatedAt, &roleUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan member: %w", err)
		}

		m, ok := membersByID[memberID]
		if !ok {
			m = &server.Member{
				ID:                         memberID,
				ServerID:                   srvID,
				UserID:                     userID,
				JoinedAt:                   joinedAt,
				CommunicationDisabledUntil: commDisabledUntil,
			}
			if nickname != nil {
				m.Nickname = *nickname
			}
			membersByID[memberID] = m
			members = append(members, m)
		}

		if roleID != nil {
			role := server.Role{
				ID:            *roleID,
				ServerID:      derefString(roleServerID),
				Name:          derefString(roleName),
				Color:         derefString(roleColor),
				Position:      derefInt(rolePosition),
				Permissions:   server.Permission(derefInt64(rolePermissions)),
				IsDefault:     derefBool(roleIsDefault),
				IsMentionable: derefBool(roleIsMentionable),
				CreatedAt:     derefTime(roleCreatedAt),
				UpdatedAt:     derefTime(roleUpdatedAt),
			}
			m.Roles = append(m.Roles, role)
		}
	}

	return members, nil
}

func derefString(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func derefInt(v *int) int {
	if v == nil {
		return 0
	}
	return *v
}

func derefInt64(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

func derefBool(v *bool) bool {
	if v == nil {
		return false
	}
	return *v
}

func derefTime(v *time.Time) time.Time {
	if v == nil {
		return time.Time{}
	}
	return *v
}

// FindByServerAndUser finds a member by server and user ID.
func (r *MemberRepository) FindByServerAndUser(ctx context.Context, serverID, userID string) (*server.Member, error) {
	query := `
		SELECT id, server_id, user_id, nickname, joined_at, communication_disabled_until
		FROM server_members
		WHERE server_id = $1 AND user_id = $2
	`

	var m server.Member
	var nickname *string
	err := r.pool.QueryRow(ctx, query, serverID, userID).Scan(
		&m.ID, &m.ServerID, &m.UserID, &nickname, &m.JoinedAt, &m.CommunicationDisabledUntil,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, server.ErrNotMember
		}
		return nil, fmt.Errorf("query member: %w", err)
	}

	if nickname != nil {
		m.Nickname = *nickname
	}

	return &m, nil
}

// FindByServerAndUserWithRoles finds a member with all their roles populated.
func (r *MemberRepository) FindByServerAndUserWithRoles(ctx context.Context, serverID, userID string) (*server.Member, error) {
	// First get the member
	m, err := r.FindByServerAndUser(ctx, serverID, userID)
	if err != nil {
		return nil, err
	}

	// Then fetch their roles
	rolesQuery := `
		SELECT r.id, r.server_id, r.name, r.color, r.position, 
		       r.permissions, r.is_default, r.is_mentionable, r.created_at, r.updated_at
		FROM roles r
		INNER JOIN member_roles mr ON r.id = mr.role_id
		WHERE mr.member_id = $1
		ORDER BY r.position DESC
	`

	rows, err := r.pool.Query(ctx, rolesQuery, m.ID)
	if err != nil {
		return nil, fmt.Errorf("query member roles: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var role server.Role
		err := rows.Scan(
			&role.ID, &role.ServerID, &role.Name, &role.Color, &role.Position,
			&role.Permissions, &role.IsDefault, &role.IsMentionable, &role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		m.Roles = append(m.Roles, role)
	}

	return m, nil
}

// Create adds a member to a server.
func (r *MemberRepository) Create(ctx context.Context, m *server.Member) error {
	query := `
		INSERT INTO server_members (id, server_id, user_id, nickname, joined_at, communication_disabled_until)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	var nickname *string
	if m.Nickname != "" {
		nickname = &m.Nickname
	}

	_, err := r.pool.Exec(ctx, query,
		m.ID, m.ServerID, m.UserID, nickname, m.JoinedAt, m.CommunicationDisabledUntil,
	)

	if err != nil {
		errStr := err.Error()
		if contains(errStr, "unique_server_member") {
			return server.ErrAlreadyMember
		}
		return fmt.Errorf("insert member: %w", err)
	}

	return nil
}

// Update updates an existing member.
func (r *MemberRepository) Update(ctx context.Context, m *server.Member) error {
	query := `
		UPDATE server_members
		SET nickname = $3, communication_disabled_until = $4
		WHERE server_id = $1 AND user_id = $2
	`

	var nickname *string
	if m.Nickname != "" {
		nickname = &m.Nickname
	}

	_, err := r.pool.Exec(ctx, query,
		m.ServerID, m.UserID, nickname, m.CommunicationDisabledUntil,
	)

	if err != nil {
		return fmt.Errorf("update member: %w", err)
	}
	return nil
}

// Delete removes a member from a server.
func (r *MemberRepository) Delete(ctx context.Context, serverID, userID string) error {
	query := `DELETE FROM server_members WHERE server_id = $1 AND user_id = $2`

	result, err := r.pool.Exec(ctx, query, serverID, userID)
	if err != nil {
		return fmt.Errorf("delete member: %w", err)
	}

	if result.RowsAffected() == 0 {
		return server.ErrNotMember
	}

	return nil
}

// AssignRole assigns a role to a member.
func (r *MemberRepository) AssignRole(ctx context.Context, memberID, roleID string) error {
	query := `INSERT INTO member_roles (member_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`

	_, err := r.pool.Exec(ctx, query, memberID, roleID)
	if err != nil {
		return fmt.Errorf("assign role: %w", err)
	}

	return nil
}

// RemoveRole removes a role from a member.
func (r *MemberRepository) RemoveRole(ctx context.Context, memberID, roleID string) error {
	query := `DELETE FROM member_roles WHERE member_id = $1 AND role_id = $2`

	_, err := r.pool.Exec(ctx, query, memberID, roleID)
	if err != nil {
		return fmt.Errorf("remove role: %w", err)
	}

	return nil
}

// IsMember checks if a user is a member of a server.
func (r *MemberRepository) IsMember(ctx context.Context, serverID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, serverID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check membership: %w", err)
	}

	return exists, nil
}

// ============================================================================
// ROLE REPOSITORY
// ============================================================================

// RoleRepository implements server.RoleRepository using PostgreSQL.
type RoleRepository struct {
	pool *pgxpool.Pool
}

// NewRoleRepository creates a new RoleRepository.
func NewRoleRepository(pool *pgxpool.Pool) *RoleRepository {
	return &RoleRepository{pool: pool}
}

// FindByID finds a role by its ID.
func (r *RoleRepository) FindByID(ctx context.Context, id string) (*server.Role, error) {
	query := `
		SELECT id, server_id, name, color, position, permissions, 
		       is_default, is_mentionable, created_at, updated_at
		FROM roles
		WHERE id = $1
	`

	var role server.Role
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&role.ID, &role.ServerID, &role.Name, &role.Color, &role.Position,
		&role.Permissions, &role.IsDefault, &role.IsMentionable, &role.CreatedAt, &role.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, server.ErrRoleNotFound
		}
		return nil, fmt.Errorf("query role by id: %w", err)
	}

	return &role, nil
}

// FindByServerID finds all roles of a server.
func (r *RoleRepository) FindByServerID(ctx context.Context, serverID string) ([]*server.Role, error) {
	query := `
		SELECT id, server_id, name, color, position, permissions, 
		       is_default, is_mentionable, created_at, updated_at
		FROM roles
		WHERE server_id = $1
		ORDER BY position DESC
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query roles by server id: %w", err)
	}
	defer rows.Close()

	var roles []*server.Role
	for rows.Next() {
		var role server.Role
		err := rows.Scan(
			&role.ID, &role.ServerID, &role.Name, &role.Color, &role.Position,
			&role.Permissions, &role.IsDefault, &role.IsMentionable, &role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, &role)
	}

	return roles, nil
}

// FindDefaultRole finds the @everyone role for a server.
func (r *RoleRepository) FindDefaultRole(ctx context.Context, serverID string) (*server.Role, error) {
	query := `
		SELECT id, server_id, name, color, position, permissions, 
		       is_default, is_mentionable, created_at, updated_at
		FROM roles
		WHERE server_id = $1 AND is_default = TRUE
		LIMIT 1
	`

	var role server.Role
	err := r.pool.QueryRow(ctx, query, serverID).Scan(
		&role.ID, &role.ServerID, &role.Name, &role.Color, &role.Position,
		&role.Permissions, &role.IsDefault, &role.IsMentionable, &role.CreatedAt, &role.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, server.ErrRoleNotFound
		}
		return nil, fmt.Errorf("query default role: %w", err)
	}

	return &role, nil
}

// FindByMemberID finds all roles assigned to a member.
func (r *RoleRepository) FindByMemberID(ctx context.Context, memberID string) ([]*server.Role, error) {
	query := `
		SELECT r.id, r.server_id, r.name, r.color, r.position, r.permissions, 
		       r.is_default, r.is_mentionable, r.created_at, r.updated_at
		FROM roles r
		INNER JOIN member_roles mr ON r.id = mr.role_id
		WHERE mr.member_id = $1
		ORDER BY r.position DESC
	`

	rows, err := r.pool.Query(ctx, query, memberID)
	if err != nil {
		return nil, fmt.Errorf("query roles by member id: %w", err)
	}
	defer rows.Close()

	var roles []*server.Role
	for rows.Next() {
		var role server.Role
		err := rows.Scan(
			&role.ID, &role.ServerID, &role.Name, &role.Color, &role.Position,
			&role.Permissions, &role.IsDefault, &role.IsMentionable, &role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, &role)
	}

	return roles, nil
}

// Create creates a new role.
func (r *RoleRepository) Create(ctx context.Context, role *server.Role) error {
	query := `
		INSERT INTO roles (id, server_id, name, color, position, permissions, 
		                   is_default, is_mentionable, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.pool.Exec(ctx, query,
		role.ID, role.ServerID, role.Name, role.Color, role.Position,
		role.Permissions, role.IsDefault, role.IsMentionable, role.CreatedAt, role.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert role: %w", err)
	}

	return nil
}

// Update updates an existing role.
func (r *RoleRepository) Update(ctx context.Context, role *server.Role) error {
	query := `
		UPDATE roles SET
			name = $2,
			color = $3,
			position = $4,
			permissions = $5,
			is_mentionable = $6,
			updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		role.ID, role.Name, role.Color, role.Position,
		role.Permissions, role.IsMentionable,
	)

	if err != nil {
		return fmt.Errorf("update role: %w", err)
	}

	if result.RowsAffected() == 0 {
		return server.ErrRoleNotFound
	}

	return nil
}

// Delete deletes a role by its ID.
func (r *RoleRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM roles WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete role: %w", err)
	}

	if result.RowsAffected() == 0 {
		return server.ErrRoleNotFound
	}

	return nil
}

// UpdatePositions updates the positions of multiple roles (for reordering).
func (r *RoleRepository) UpdatePositions(ctx context.Context, serverID string, positions map[string]int) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	query := `UPDATE roles SET position = $2, updated_at = NOW() WHERE id = $1 AND server_id = $3`

	for roleID, position := range positions {
		_, err := tx.Exec(ctx, query, roleID, position, serverID)
		if err != nil {
			return fmt.Errorf("update role position: %w", err)
		}
	}

	return tx.Commit(ctx)
}

type JoinRequestRepository struct {
	pool *pgxpool.Pool
}

func NewJoinRequestRepository(pool *pgxpool.Pool) *JoinRequestRepository {
	return &JoinRequestRepository{pool: pool}
}

func (r *JoinRequestRepository) Create(ctx context.Context, req *server.JoinRequest) error {
	query := `
		INSERT INTO server_join_requests (server_id, user_id, status, message, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (server_id, user_id)
		DO UPDATE SET status = EXCLUDED.status, message = EXCLUDED.message, created_at = NOW(), updated_at = NOW()
	`

	_, err := r.pool.Exec(ctx, query, req.ServerID, req.UserID, req.Status, req.Message)
	if err != nil {
		return fmt.Errorf("create join request: %w", err)
	}
	return nil
}

func (r *JoinRequestRepository) UpdateStatus(ctx context.Context, serverID, userID string, status server.JoinRequestStatus) error {
	query := `
		UPDATE server_join_requests
		SET status = $3, updated_at = NOW()
		WHERE server_id = $1 AND user_id = $2 AND status = 'pending'
	`

	res, err := r.pool.Exec(ctx, query, serverID, userID, status)
	if err != nil {
		return fmt.Errorf("update join request status: %w", err)
	}
	if res.RowsAffected() == 0 {
		return server.ErrJoinRequestNotFound
	}
	return nil
}

func (r *JoinRequestRepository) Delete(ctx context.Context, serverID, userID string) error {
	query := `DELETE FROM server_join_requests WHERE server_id = $1 AND user_id = $2`

	res, err := r.pool.Exec(ctx, query, serverID, userID)
	if err != nil {
		return fmt.Errorf("delete join request: %w", err)
	}
	if res.RowsAffected() == 0 {
		return server.ErrJoinRequestNotFound
	}
	return nil
}

func (r *JoinRequestRepository) FindByServerAndUser(ctx context.Context, serverID, userID string) (*server.JoinRequest, error) {
	query := `
		SELECT server_id, user_id, status, message, created_at, updated_at
		FROM server_join_requests
		WHERE server_id = $1 AND user_id = $2
		LIMIT 1
	`

	var jr server.JoinRequest
	err := r.pool.QueryRow(ctx, query, serverID, userID).Scan(
		&jr.ServerID, &jr.UserID, &jr.Status, &jr.Message, &jr.CreatedAt, &jr.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, server.ErrJoinRequestNotFound
		}
		return nil, fmt.Errorf("find join request: %w", err)
	}

	return &jr, nil
}

func (r *JoinRequestRepository) FindPendingByServerID(ctx context.Context, serverID string) ([]*server.JoinRequest, error) {
	query := `
		SELECT server_id, user_id, status, message, created_at, updated_at
		FROM server_join_requests
		WHERE server_id = $1 AND status = 'pending'
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("find pending join requests: %w", err)
	}
	defer rows.Close()

	var out []*server.JoinRequest
	for rows.Next() {
		var jr server.JoinRequest
		if err := rows.Scan(&jr.ServerID, &jr.UserID, &jr.Status, &jr.Message, &jr.CreatedAt, &jr.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan join request: %w", err)
		}
		out = append(out, &jr)
	}
	if rows.Err() != nil {
		return nil, fmt.Errorf("iterate join requests: %w", rows.Err())
	}

	return out, nil
}
