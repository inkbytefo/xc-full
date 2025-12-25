package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/media"
)

// MediaRepository implements media.Repository using PostgreSQL.
type MediaRepository struct {
	pool *pgxpool.Pool
}

// NewMediaRepository creates a new MediaRepository.
func NewMediaRepository(pool *pgxpool.Pool) *MediaRepository {
	return &MediaRepository{pool: pool}
}

// Create inserts a new media record.
func (r *MediaRepository) Create(ctx context.Context, m *media.Media) error {
	query := `
		INSERT INTO media (id, user_id, filename, original_name, mime_type, type, size, url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.pool.Exec(ctx, query,
		m.ID, m.UserID, m.Filename, m.OriginalName, m.MimeType, m.Type, m.Size, m.URL, m.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert media: %w", err)
	}

	return nil
}

// FindByID finds a media by its ID.
func (r *MediaRepository) FindByID(ctx context.Context, id string) (*media.Media, error) {
	query := `
		SELECT id, user_id, filename, original_name, mime_type, type, size, url, created_at
		FROM media
		WHERE id = $1
	`

	var m media.Media
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.UserID, &m.Filename, &m.OriginalName, &m.MimeType, &m.Type, &m.Size, &m.URL, &m.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, media.ErrNotFound
		}
		return nil, fmt.Errorf("query media by id: %w", err)
	}

	return &m, nil
}

// FindByUserID finds media by user ID with pagination.
func (r *MediaRepository) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]*media.Media, error) {
	query := `
		SELECT id, user_id, filename, original_name, mime_type, type, size, url, created_at
		FROM media
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query media by user: %w", err)
	}
	defer rows.Close()

	var result []*media.Media
	for rows.Next() {
		var m media.Media
		err := rows.Scan(
			&m.ID, &m.UserID, &m.Filename, &m.OriginalName, &m.MimeType, &m.Type, &m.Size, &m.URL, &m.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan media: %w", err)
		}
		result = append(result, &m)
	}

	return result, nil
}

// Delete removes a media record.
func (r *MediaRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM media WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete media: %w", err)
	}

	if result.RowsAffected() == 0 {
		return media.ErrNotFound
	}

	return nil
}
