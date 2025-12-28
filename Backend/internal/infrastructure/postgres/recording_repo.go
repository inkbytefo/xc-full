package postgres

import (
	"context"
	"fmt"
	"pink/internal/domain/live"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RecordingRepository implements live.RecordingRepository using PostgreSQL.
type RecordingRepository struct {
	pool *pgxpool.Pool
}

// NewRecordingRepository creates a new RecordingRepository.
func NewRecordingRepository(pool *pgxpool.Pool) *RecordingRepository {
	return &RecordingRepository{pool: pool}
}

// Create inserts a new recording.
func (r *RecordingRepository) Create(ctx context.Context, rec *live.Recording) error {
	query := `
		INSERT INTO recordings (id, stream_id, user_id, file_path, duration, thumbnail_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.pool.Exec(ctx, query,
		rec.ID, rec.StreamID, rec.UserID, rec.FilePath, rec.Duration, rec.ThumbnailURL, rec.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert recording: %w", err)
	}
	return nil
}

// FindByStreamID returns recordings for a given stream ID.
func (r *RecordingRepository) FindByStreamID(ctx context.Context, streamID string) ([]*live.Recording, error) {
	query := `
		SELECT id, stream_id, user_id, file_path, duration, thumbnail_url, created_at
		FROM recordings
		WHERE stream_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, streamID)
	if err != nil {
		return nil, fmt.Errorf("query recordings: %w", err)
	}
	defer rows.Close()

	var recordings []*live.Recording
	for rows.Next() {
		var rec live.Recording
		err := rows.Scan(
			&rec.ID, &rec.StreamID, &rec.UserID, &rec.FilePath, &rec.Duration, &rec.ThumbnailURL, &rec.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan recording: %w", err)
		}
		recordings = append(recordings, &rec)
	}
	return recordings, nil
}

// FindByID returns a recording by ID.
func (r *RecordingRepository) FindByID(ctx context.Context, id string) (*live.Recording, error) {
	query := `
		SELECT id, stream_id, user_id, file_path, duration, thumbnail_url, created_at
		FROM recordings
		WHERE id = $1
	`
	var rec live.Recording
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&rec.ID, &rec.StreamID, &rec.UserID, &rec.FilePath, &rec.Duration, &rec.ThumbnailURL, &rec.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("query recording by id: %w", err)
	}
	return &rec, nil
}
