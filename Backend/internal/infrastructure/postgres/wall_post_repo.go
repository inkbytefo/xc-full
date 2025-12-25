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

	"xcord/internal/domain/server"
)

// WallPostRepository implements server.WallPostRepository using PostgreSQL.
type WallPostRepository struct {
	pool *pgxpool.Pool
}

// NewWallPostRepository creates a new WallPostRepository.
func NewWallPostRepository(pool *pgxpool.Pool) *WallPostRepository {
	return &WallPostRepository{pool: pool}
}

// Create creates a new wall post.
func (r *WallPostRepository) Create(ctx context.Context, post *server.WallPost) error {
	query := `
		INSERT INTO server_wall_posts (id, server_id, author_id, content, is_pinned, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	if post.ID == "" {
		post.ID = generateWallPostID()
	}
	if post.CreatedAt.IsZero() {
		post.CreatedAt = time.Now()
	}
	post.UpdatedAt = post.CreatedAt

	_, err := r.pool.Exec(ctx, query,
		post.ID,
		post.ServerID,
		post.AuthorID,
		post.Content,
		post.IsPinned,
		post.CreatedAt,
		post.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert wall post: %w", err)
	}

	return nil
}

// FindByID finds a wall post by ID.
func (r *WallPostRepository) FindByID(ctx context.Context, id string) (*server.WallPost, error) {
	query := `
		SELECT id, server_id, author_id, content, is_pinned, created_at, updated_at
		FROM server_wall_posts
		WHERE id = $1
	`

	var post server.WallPost
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&post.ID,
		&post.ServerID,
		&post.AuthorID,
		&post.Content,
		&post.IsPinned,
		&post.CreatedAt,
		&post.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("wall post not found")
		}
		return nil, fmt.Errorf("query wall post: %w", err)
	}

	return &post, nil
}

// FindByServer finds all wall posts for a server.
func (r *WallPostRepository) FindByServer(ctx context.Context, serverID string, cursor string, limit int) ([]*server.WallPost, string, error) {
	query := `
		SELECT id, server_id, author_id, content, is_pinned, created_at, updated_at
		FROM server_wall_posts
		WHERE server_id = $1
		AND ($2 = '' OR created_at < (SELECT created_at FROM server_wall_posts WHERE id = $2))
		ORDER BY is_pinned DESC, created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, serverID, cursor, limit+1)
	if err != nil {
		return nil, "", fmt.Errorf("query wall posts: %w", err)
	}
	defer rows.Close()

	var posts []*server.WallPost
	for rows.Next() {
		var post server.WallPost
		if err := rows.Scan(
			&post.ID,
			&post.ServerID,
			&post.AuthorID,
			&post.Content,
			&post.IsPinned,
			&post.CreatedAt,
			&post.UpdatedAt,
		); err != nil {
			return nil, "", fmt.Errorf("scan wall post: %w", err)
		}
		posts = append(posts, &post)
	}

	var nextCursor string
	if len(posts) > limit {
		nextCursor = posts[limit-1].ID
		posts = posts[:limit]
	}

	return posts, nextCursor, nil
}

// Update updates a wall post.
func (r *WallPostRepository) Update(ctx context.Context, post *server.WallPost) error {
	query := `
		UPDATE server_wall_posts SET
			content = $2,
			updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, post.ID, post.Content)
	if err != nil {
		return fmt.Errorf("update wall post: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("wall post not found")
	}

	return nil
}

// Delete deletes a wall post.
func (r *WallPostRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM server_wall_posts WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete wall post: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("wall post not found")
	}

	return nil
}

// Pin pins a wall post.
func (r *WallPostRepository) Pin(ctx context.Context, id string) error {
	query := `UPDATE server_wall_posts SET is_pinned = true, updated_at = NOW() WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("pin wall post: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("wall post not found")
	}

	return nil
}

// Unpin unpins a wall post.
func (r *WallPostRepository) Unpin(ctx context.Context, id string) error {
	query := `UPDATE server_wall_posts SET is_pinned = false, updated_at = NOW() WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("unpin wall post: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("wall post not found")
	}

	return nil
}

// CountByServer counts posts for a server.
func (r *WallPostRepository) CountByServer(ctx context.Context, serverID string) (int64, error) {
	query := `SELECT COUNT(*) FROM server_wall_posts WHERE server_id = $1`

	var count int64
	err := r.pool.QueryRow(ctx, query, serverID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count wall posts: %w", err)
	}

	return count, nil
}

func generateWallPostID() string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	return "wpos_" + clean[:21]
}
