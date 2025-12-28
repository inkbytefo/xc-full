// Package postgres provides PostgreSQL implementations of domain repositories.
package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/user"
)

// UserRepository implements user.Repository using PostgreSQL.
type UserRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// FindByID finds a user by their ID.
func (r *UserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
	query := `
		SELECT id, handle, display_name, email, password_hash, 
		       avatar_gradient, avatar_url, banner_url, bio, is_verified, is_active, metadata,
		       last_seen_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var u user.User
	var gradient []string
	var avatarURL, bannerURL *string
	var bio *string
	var lastSeenAt *time.Time

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Handle,
		&u.DisplayName,
		&u.Email,
		&u.PasswordHash,
		&gradient,
		&avatarURL,
		&bannerURL,
		&bio,
		&u.IsVerified,
		&u.IsActive,
		&u.Metadata,
		&lastSeenAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, fmt.Errorf("query user by id: %w", err)
	}

	if len(gradient) >= 2 {
		u.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	if avatarURL != nil {
		u.AvatarURL = *avatarURL
	}
	if bannerURL != nil {
		u.BannerURL = *bannerURL
	}
	if bio != nil {
		u.Bio = *bio
	}
	u.LastSeenAt = lastSeenAt

	return &u, nil
}

// FindByEmail finds a user by their email address.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	query := `
		SELECT id, handle, display_name, email, password_hash, 
		       avatar_gradient, avatar_url, banner_url, bio, is_verified, is_active, metadata,
		       last_seen_at, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var u user.User
	var gradient []string
	var avatarURL, bannerURL *string
	var bio *string
	var lastSeenAt *time.Time

	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Handle,
		&u.DisplayName,
		&u.Email,
		&u.PasswordHash,
		&gradient,
		&avatarURL,
		&bannerURL,
		&bio,
		&u.IsVerified,
		&u.IsActive,
		&u.Metadata,
		&lastSeenAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, fmt.Errorf("query user by email: %w", err)
	}

	if len(gradient) >= 2 {
		u.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	if avatarURL != nil {
		u.AvatarURL = *avatarURL
	}
	if bannerURL != nil {
		u.BannerURL = *bannerURL
	}
	if bio != nil {
		u.Bio = *bio
	}
	u.LastSeenAt = lastSeenAt

	return &u, nil
}

// FindByHandle finds a user by their handle.
func (r *UserRepository) FindByHandle(ctx context.Context, handle string) (*user.User, error) {
	query := `
		SELECT id, handle, display_name, email, password_hash, 
		       avatar_gradient, avatar_url, banner_url, bio, is_verified, is_active, metadata,
		       last_seen_at, created_at, updated_at
		FROM users
		WHERE handle = $1
	`

	var u user.User
	var gradient []string
	var avatarURL, bannerURL *string
	var bio *string
	var lastSeenAt *time.Time

	err := r.pool.QueryRow(ctx, query, handle).Scan(
		&u.ID,
		&u.Handle,
		&u.DisplayName,
		&u.Email,
		&u.PasswordHash,
		&gradient,
		&avatarURL,
		&bannerURL,
		&bio,
		&u.IsVerified,
		&u.IsActive,
		&u.Metadata,
		&lastSeenAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrNotFound
		}
		return nil, fmt.Errorf("query user by handle: %w", err)
	}

	if len(gradient) >= 2 {
		u.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	if avatarURL != nil {
		u.AvatarURL = *avatarURL
	}
	if bannerURL != nil {
		u.BannerURL = *bannerURL
	}
	if bio != nil {
		u.Bio = *bio
	}
	u.LastSeenAt = lastSeenAt

	return &u, nil
}

// Create creates a new user.
func (r *UserRepository) Create(ctx context.Context, u *user.User) error {
	query := `
		INSERT INTO users (
			id, handle, display_name, email, password_hash,
			avatar_gradient, bio, is_verified, is_active, metadata,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	var bio *string
	if u.Bio != "" {
		bio = &u.Bio
	}

	_, err := r.pool.Exec(ctx, query,
		u.ID,
		u.Handle,
		u.DisplayName,
		u.Email,
		u.PasswordHash,
		u.AvatarGradient[:],
		bio,
		u.IsVerified,
		u.IsActive,
		u.Metadata,
		u.CreatedAt,
		u.UpdatedAt,
	)

	if err != nil {
		// Check for unique constraint violations
		errStr := err.Error()
		if contains(errStr, "users_email_key") {
			return user.ErrEmailAlreadyExists
		}
		if contains(errStr, "users_handle_key") {
			return user.ErrHandleAlreadyExists
		}
		return fmt.Errorf("insert user: %w", err)
	}

	return nil
}

// Update updates an existing user.
func (r *UserRepository) Update(ctx context.Context, u *user.User) error {
	query := `
		UPDATE users SET
			handle = $2,
			display_name = $3,
			email = $4,
			avatar_gradient = $5,
			avatar_url = $6,
			banner_url = $7,
			bio = $8,
			is_verified = $9,
			is_active = $10,
			metadata = $11,
			updated_at = NOW()
		WHERE id = $1
	`

	var bio *string
	if u.Bio != "" {
		bio = &u.Bio
	}

	var avatarURL, bannerURL *string
	if u.AvatarURL != "" {
		avatarURL = &u.AvatarURL
	}
	if u.BannerURL != "" {
		bannerURL = &u.BannerURL
	}

	result, err := r.pool.Exec(ctx, query,
		u.ID,
		u.Handle,
		u.DisplayName,
		u.Email,
		u.AvatarGradient[:],
		avatarURL,
		bannerURL,
		bio,
		u.IsVerified,
		u.IsActive,
		u.Metadata,
	)

	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrNotFound
	}

	return nil
}

// Delete deletes a user by their ID.
func (r *UserRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrNotFound
	}

	return nil
}

// UpdateLastSeen updates the user's last seen timestamp.
func (r *UserRepository) UpdateLastSeen(ctx context.Context, id string) error {
	query := `UPDATE users SET last_seen_at = NOW() WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("update last seen: %w", err)
	}

	return nil
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
