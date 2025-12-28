package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/live"
)

// StreamRepository implements live.StreamRepository using PostgreSQL.
type StreamRepository struct {
	pool *pgxpool.Pool
}

// NewStreamRepository creates a new StreamRepository.
func NewStreamRepository(pool *pgxpool.Pool) *StreamRepository {
	return &StreamRepository{pool: pool}
}

// FindByID finds a stream by its ID.
func (r *StreamRepository) FindByID(ctx context.Context, id string) (*live.Stream, error) {
	query := `
		SELECT s.id, s.user_id, s.title, s.description, s.category_id, s.thumbnail_url, 
		       s.stream_key, s.status, s.viewer_count, s.is_nsfw, s.started_at, s.ended_at, s.created_at, s.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified,
		       c.id, c.name, c.slug
		FROM streams s
		JOIN users u ON s.user_id = u.id
		LEFT JOIN stream_categories c ON s.category_id = c.id
		WHERE s.id = $1
	`

	var stream live.Stream
	var streamer live.StreamerInfo
	var gradient []string
	var catID, catName, catSlug *string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&stream.ID, &stream.UserID, &stream.Title, &stream.Description, &stream.CategoryID, &stream.ThumbnailURL,
		&stream.StreamKey, &stream.Status, &stream.ViewerCount, &stream.IsNSFW, &stream.StartedAt, &stream.EndedAt, &stream.CreatedAt, &stream.UpdatedAt,
		&streamer.ID, &streamer.Handle, &streamer.DisplayName, &gradient, &streamer.IsVerified,
		&catID, &catName, &catSlug,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, live.ErrStreamNotFound
		}
		return nil, fmt.Errorf("query stream by id: %w", err)
	}

	if len(gradient) >= 2 {
		streamer.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	stream.Streamer = &streamer

	if catID != nil {
		stream.Category = &live.Category{ID: *catID, Name: *catName, Slug: *catSlug}
	}

	return &stream, nil
}

// FindByUserID finds an active stream by user ID.
func (r *StreamRepository) FindByUserID(ctx context.Context, userID string) (*live.Stream, error) {
	query := `SELECT id FROM streams WHERE user_id = $1 AND status = 'live' LIMIT 1`

	var id string
	err := r.pool.QueryRow(ctx, query, userID).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, live.ErrStreamNotFound
		}
		return nil, fmt.Errorf("query stream by user: %w", err)
	}

	return r.FindByID(ctx, id)
}

// FindByStreamKey finds a stream by its stream key.
func (r *StreamRepository) FindByStreamKey(ctx context.Context, streamKey string) (*live.Stream, error) {
	query := `SELECT id FROM streams WHERE stream_key = $1 LIMIT 1`

	var id string
	err := r.pool.QueryRow(ctx, query, streamKey).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, live.ErrStreamNotFound
		}
		return nil, fmt.Errorf("query stream by key: %w", err)
	}

	return r.FindByID(ctx, id)
}

// FindLive finds all live streams with pagination.
func (r *StreamRepository) FindLive(ctx context.Context, cursor string, limit int) ([]*live.Stream, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	query := `
		SELECT s.id, s.user_id, s.title, s.description, s.category_id, s.thumbnail_url, 
		       s.stream_key, s.status, s.viewer_count, s.is_nsfw, s.started_at, s.ended_at, s.created_at, s.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified,
		       c.id, c.name, c.slug
		FROM streams s
		JOIN users u ON s.user_id = u.id
		LEFT JOIN stream_categories c ON s.category_id = c.id
		WHERE s.status = 'live'
		ORDER BY s.viewer_count DESC, s.started_at DESC
		LIMIT $1
	`

	rows, err := r.pool.Query(ctx, query, limit+1)
	if err != nil {
		return nil, "", fmt.Errorf("query live streams: %w", err)
	}
	defer rows.Close()

	return r.scanStreams(rows, limit)
}

// FindByCategoryID finds live streams by category.
func (r *StreamRepository) FindByCategoryID(ctx context.Context, categoryID, cursor string, limit int) ([]*live.Stream, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	query := `
		SELECT s.id, s.user_id, s.title, s.description, s.category_id, s.thumbnail_url, 
		       s.stream_key, s.status, s.viewer_count, s.is_nsfw, s.started_at, s.ended_at, s.created_at, s.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified,
		       c.id, c.name, c.slug
		FROM streams s
		JOIN users u ON s.user_id = u.id
		LEFT JOIN stream_categories c ON s.category_id = c.id
		WHERE s.status = 'live' AND s.category_id = $1
		ORDER BY s.viewer_count DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, categoryID, limit+1)
	if err != nil {
		return nil, "", fmt.Errorf("query category streams: %w", err)
	}
	defer rows.Close()

	return r.scanStreams(rows, limit)
}

func (r *StreamRepository) scanStreams(rows pgx.Rows, limit int) ([]*live.Stream, string, error) {
	var streams []*live.Stream

	for rows.Next() {
		var stream live.Stream
		var streamer live.StreamerInfo
		var gradient []string
		var catID, catName, catSlug *string

		err := rows.Scan(
			&stream.ID, &stream.UserID, &stream.Title, &stream.Description, &stream.CategoryID, &stream.ThumbnailURL,
			&stream.StreamKey, &stream.Status, &stream.ViewerCount, &stream.IsNSFW, &stream.StartedAt, &stream.EndedAt, &stream.CreatedAt, &stream.UpdatedAt,
			&streamer.ID, &streamer.Handle, &streamer.DisplayName, &gradient, &streamer.IsVerified,
			&catID, &catName, &catSlug,
		)
		if err != nil {
			return nil, "", fmt.Errorf("scan stream: %w", err)
		}

		if len(gradient) >= 2 {
			streamer.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}
		stream.Streamer = &streamer

		if catID != nil {
			stream.Category = &live.Category{ID: *catID, Name: *catName, Slug: *catSlug}
		}

		streams = append(streams, &stream)
	}

	var nextCursor string
	if len(streams) > limit {
		streams = streams[:limit]
		nextCursor = streams[limit-1].ID
	}

	return streams, nextCursor, nil
}

// Create creates a new stream.
func (r *StreamRepository) Create(ctx context.Context, stream *live.Stream) error {
	query := `
		INSERT INTO streams (id, user_id, title, description, category_id, thumbnail_url, stream_key, status, viewer_count, is_nsfw, started_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.pool.Exec(ctx, query,
		stream.ID, stream.UserID, stream.Title, stream.Description, stream.CategoryID, stream.ThumbnailURL,
		stream.StreamKey, stream.Status, stream.ViewerCount, stream.IsNSFW, stream.StartedAt, stream.CreatedAt, stream.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert stream: %w", err)
	}

	return nil
}

// Update updates a stream.
func (r *StreamRepository) Update(ctx context.Context, stream *live.Stream) error {
	query := `
		UPDATE streams 
		SET title = $2, description = $3, category_id = $4, thumbnail_url = $5, is_nsfw = $6, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		stream.ID, stream.Title, stream.Description, stream.CategoryID, stream.ThumbnailURL, stream.IsNSFW,
	)
	if err != nil {
		return fmt.Errorf("update stream: %w", err)
	}

	if result.RowsAffected() == 0 {
		return live.ErrStreamNotFound
	}

	return nil
}

// UpdateStatus updates stream status.
func (r *StreamRepository) UpdateStatus(ctx context.Context, id string, status live.StreamStatus) error {
	var query string
	if status == live.StatusLive {
		query = `UPDATE streams SET status = $2, started_at = NOW(), updated_at = NOW() WHERE id = $1`
	} else if status == live.StatusOffline {
		query = `UPDATE streams SET status = $2, ended_at = NOW(), viewer_count = 0, updated_at = NOW() WHERE id = $1`
	} else {
		query = `UPDATE streams SET status = $2, updated_at = NOW() WHERE id = $1`
	}

	result, err := r.pool.Exec(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("update stream status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return live.ErrStreamNotFound
	}

	return nil
}

// UpdateViewerCount updates viewer count.
func (r *StreamRepository) UpdateViewerCount(ctx context.Context, id string, delta int) error {
	query := `UPDATE streams SET viewer_count = GREATEST(0, viewer_count + $2), updated_at = NOW() WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id, delta)
	if err != nil {
		return fmt.Errorf("update viewer count: %w", err)
	}

	return nil
}

// Delete deletes a stream.
func (r *StreamRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM streams WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete stream: %w", err)
	}

	if result.RowsAffected() == 0 {
		return live.ErrStreamNotFound
	}

	return nil
}
