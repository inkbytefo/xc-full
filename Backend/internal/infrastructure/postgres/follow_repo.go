// Package postgres provides PostgreSQL implementations of domain repositories.
package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/user"
)

// FollowRepository implements user.FollowRepository using PostgreSQL.
type FollowRepository struct {
	pool *pgxpool.Pool
}

// NewFollowRepository creates a new FollowRepository.
func NewFollowRepository(pool *pgxpool.Pool) *FollowRepository {
	return &FollowRepository{pool: pool}
}

// Create creates a new follow relationship with counter updates.
func (r *FollowRepository) Create(ctx context.Context, follow *user.Follow) error {
	if follow.ID == "" {
		follow.ID = generateFollowID()
	}
	if follow.CreatedAt.IsZero() {
		follow.CreatedAt = time.Now()
	}
	if follow.UpdatedAt.IsZero() {
		follow.UpdatedAt = follow.CreatedAt
	}
	if follow.Status == "" {
		follow.Status = user.FollowStatusActive
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Insert follow relationship
	insertQuery := `
		INSERT INTO follows (id, follower_id, followed_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (follower_id, followed_id) DO UPDATE SET status = $4, updated_at = $6
	`
	_, err = tx.Exec(ctx, insertQuery,
		follow.ID,
		follow.FollowerID,
		follow.FollowedID,
		follow.Status,
		follow.CreatedAt,
		follow.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert follow: %w", err)
	}

	// Update counters only for active follows
	if follow.Status == user.FollowStatusActive {
		_, err = tx.Exec(ctx, `UPDATE users SET following_count = following_count + 1 WHERE id = $1`, follow.FollowerID)
		if err != nil {
			return fmt.Errorf("update following_count: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE users SET followers_count = followers_count + 1 WHERE id = $1`, follow.FollowedID)
		if err != nil {
			return fmt.Errorf("update followers_count: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// Delete deletes a follow relationship and decrements counters.
func (r *FollowRepository) Delete(ctx context.Context, followerID, followedID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Check if follow was active before deleting
	var status string
	err = tx.QueryRow(ctx, `SELECT status FROM follows WHERE follower_id = $1 AND followed_id = $2`, followerID, followedID).Scan(&status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // No follow to delete
		}
		return fmt.Errorf("check follow status: %w", err)
	}

	// Delete follow
	_, err = tx.Exec(ctx, `DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2`, followerID, followedID)
	if err != nil {
		return fmt.Errorf("delete follow: %w", err)
	}

	// Decrement counters only if was active
	if status == string(user.FollowStatusActive) {
		_, err = tx.Exec(ctx, `UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = $1`, followerID)
		if err != nil {
			return fmt.Errorf("update following_count: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = $1`, followedID)
		if err != nil {
			return fmt.Errorf("update followers_count: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// UpdateStatus updates the status of a follow relationship.
func (r *FollowRepository) UpdateStatus(ctx context.Context, followerID, followedID string, newStatus user.FollowStatus) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Get current status
	var oldStatus string
	err = tx.QueryRow(ctx, `SELECT status FROM follows WHERE follower_id = $1 AND followed_id = $2`, followerID, followedID).Scan(&oldStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user.ErrNotFound
		}
		return fmt.Errorf("get current status: %w", err)
	}

	// Update status
	_, err = tx.Exec(ctx, `UPDATE follows SET status = $1, updated_at = NOW() WHERE follower_id = $2 AND followed_id = $3`,
		newStatus, followerID, followedID)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Handle counter changes
	wasActive := oldStatus == string(user.FollowStatusActive)
	isActive := newStatus == user.FollowStatusActive

	if !wasActive && isActive {
		// Becoming active: increment counters
		_, err = tx.Exec(ctx, `UPDATE users SET following_count = following_count + 1 WHERE id = $1`, followerID)
		if err != nil {
			return fmt.Errorf("increment following_count: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE users SET followers_count = followers_count + 1 WHERE id = $1`, followedID)
		if err != nil {
			return fmt.Errorf("increment followers_count: %w", err)
		}
	} else if wasActive && !isActive {
		// Was active, no longer: decrement counters
		_, err = tx.Exec(ctx, `UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = $1`, followerID)
		if err != nil {
			return fmt.Errorf("decrement following_count: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = $1`, followedID)
		if err != nil {
			return fmt.Errorf("decrement followers_count: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// Exists checks if a follow relationship exists (any status).
func (r *FollowRepository) Exists(ctx context.Context, followerID, followedID string) (bool, error) {
	query := `SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = $2`

	var exists int
	err := r.pool.QueryRow(ctx, query, followerID, followedID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check follow exists: %w", err)
	}

	return true, nil
}

// ExistsWithStatus checks if a follow relationship exists with specific status.
func (r *FollowRepository) ExistsWithStatus(ctx context.Context, followerID, followedID string, status user.FollowStatus) (bool, error) {
	query := `SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = $2 AND status = $3`

	var exists int
	err := r.pool.QueryRow(ctx, query, followerID, followedID, status).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check follow exists with status: %w", err)
	}

	return true, nil
}

// FindByUsers finds a follow relationship between two users.
func (r *FollowRepository) FindByUsers(ctx context.Context, followerID, followedID string) (*user.Follow, error) {
	query := `
		SELECT id, follower_id, followed_id, status, created_at, updated_at
		FROM follows
		WHERE follower_id = $1 AND followed_id = $2
	`

	var f user.Follow
	err := r.pool.QueryRow(ctx, query, followerID, followedID).Scan(
		&f.ID, &f.FollowerID, &f.FollowedID, &f.Status, &f.CreatedAt, &f.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find follow: %w", err)
	}

	return &f, nil
}

// FindFollowers finds all active followers of a user.
func (r *FollowRepository) FindFollowers(ctx context.Context, userID string, cursor string, limit int) ([]*user.Follow, string, error) {
	query := `
		SELECT f.id, f.follower_id, f.followed_id, f.status, f.created_at, f.updated_at
		FROM follows f
		WHERE f.followed_id = $1 AND f.status = 'active'
		AND ($2 = '' OR f.created_at < (SELECT created_at FROM follows WHERE id = $2))
		ORDER BY f.created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, cursor, limit+1)
	if err != nil {
		return nil, "", fmt.Errorf("query followers: %w", err)
	}
	defer rows.Close()

	var follows []*user.Follow
	for rows.Next() {
		var f user.Follow
		if err := rows.Scan(&f.ID, &f.FollowerID, &f.FollowedID, &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, "", fmt.Errorf("scan follow: %w", err)
		}
		follows = append(follows, &f)
	}

	var nextCursor string
	if len(follows) > limit {
		nextCursor = follows[limit-1].ID
		follows = follows[:limit]
	}

	return follows, nextCursor, nil
}

// FindFollowing finds all users a user is actively following.
func (r *FollowRepository) FindFollowing(ctx context.Context, userID string, cursor string, limit int) ([]*user.Follow, string, error) {
	query := `
		SELECT f.id, f.follower_id, f.followed_id, f.status, f.created_at, f.updated_at
		FROM follows f
		WHERE f.follower_id = $1 AND f.status = 'active'
		AND ($2 = '' OR f.created_at < (SELECT created_at FROM follows WHERE id = $2))
		ORDER BY f.created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, cursor, limit+1)
	if err != nil {
		return nil, "", fmt.Errorf("query following: %w", err)
	}
	defer rows.Close()

	var follows []*user.Follow
	for rows.Next() {
		var f user.Follow
		if err := rows.Scan(&f.ID, &f.FollowerID, &f.FollowedID, &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, "", fmt.Errorf("scan follow: %w", err)
		}
		follows = append(follows, &f)
	}

	var nextCursor string
	if len(follows) > limit {
		nextCursor = follows[limit-1].ID
		follows = follows[:limit]
	}

	return follows, nextCursor, nil
}

// FindPendingRequests finds all pending follow requests for a user.
func (r *FollowRepository) FindPendingRequests(ctx context.Context, userID string, cursor string, limit int) ([]*user.Follow, string, error) {
	query := `
		SELECT f.id, f.follower_id, f.followed_id, f.status, f.created_at, f.updated_at
		FROM follows f
		WHERE f.followed_id = $1 AND f.status = 'pending'
		AND ($2 = '' OR f.created_at < (SELECT created_at FROM follows WHERE id = $2))
		ORDER BY f.created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, userID, cursor, limit+1)
	if err != nil {
		return nil, "", fmt.Errorf("query pending requests: %w", err)
	}
	defer rows.Close()

	var follows []*user.Follow
	for rows.Next() {
		var f user.Follow
		if err := rows.Scan(&f.ID, &f.FollowerID, &f.FollowedID, &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, "", fmt.Errorf("scan follow: %w", err)
		}
		follows = append(follows, &f)
	}

	var nextCursor string
	if len(follows) > limit {
		nextCursor = follows[limit-1].ID
		follows = follows[:limit]
	}

	return follows, nextCursor, nil
}

// CountFollowers counts the number of active followers a user has.
func (r *FollowRepository) CountFollowers(ctx context.Context, userID string) (int64, error) {
	query := `SELECT COUNT(*) FROM follows WHERE followed_id = $1 AND status = 'active'`

	var count int64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count followers: %w", err)
	}

	return count, nil
}

// CountFollowing counts the number of users a user is actively following.
func (r *FollowRepository) CountFollowing(ctx context.Context, userID string) (int64, error) {
	query := `SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND status = 'active'`

	var count int64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count following: %w", err)
	}

	return count, nil
}

// CountPendingRequests counts pending follow requests for a user.
func (r *FollowRepository) CountPendingRequests(ctx context.Context, userID string) (int64, error) {
	query := `SELECT COUNT(*) FROM follows WHERE followed_id = $1 AND status = 'pending'`

	var count int64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count pending requests: %w", err)
	}

	return count, nil
}

func generateFollowID() string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	return "foll_" + clean[:21]
}
