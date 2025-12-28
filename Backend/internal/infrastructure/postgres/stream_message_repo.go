package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/live"
	"pink/internal/domain/user"
)

// StreamMessageRepository implements live.StreamMessageRepository using PostgreSQL.
type StreamMessageRepository struct {
	pool *pgxpool.Pool
}

// NewStreamMessageRepository creates a new StreamMessageRepository.
func NewStreamMessageRepository(pool *pgxpool.Pool) *StreamMessageRepository {
	return &StreamMessageRepository{pool: pool}
}

// Create persists a new chat message.
func (r *StreamMessageRepository) Create(ctx context.Context, msg *live.ChatMessage) error {
	query := `
		INSERT INTO stream_messages (id, stream_id, user_id, content, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.pool.Exec(ctx, query, msg.ID, msg.StreamID, msg.UserID, msg.Content, msg.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert chat message: %w", err)
	}

	return nil
}

// FindByStreamID returns recent messages for a stream with optional pagination.
func (r *StreamMessageRepository) FindByStreamID(ctx context.Context, streamID string, limit int, before string) ([]*live.ChatMessage, error) {
	query := `
		SELECT sm.id, sm.stream_id, sm.user_id, sm.content, sm.created_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified
		FROM stream_messages sm
		JOIN users u ON sm.user_id = u.id
		WHERE sm.stream_id = $1
	`
	args := []interface{}{streamID}

	if before != "" {
		query += ` AND sm.created_at < (SELECT created_at FROM stream_messages WHERE id = $2)`
		args = append(args, before)
	}

	// Use limit + 1 for pagination/consistency but strictly just limit here based on interface
	query += fmt.Sprintf(` ORDER BY sm.created_at DESC LIMIT %d`, limit)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query chat messages: %w", err)
	}
	defer rows.Close()

	var messages []*live.ChatMessage

	for rows.Next() {
		var msg live.ChatMessage
		var u user.User
		var gradient []string

		err := rows.Scan(
			&msg.ID, &msg.StreamID, &msg.UserID, &msg.Content, &msg.CreatedAt,
			&u.ID, &u.Handle, &u.DisplayName, &gradient, &u.IsVerified,
		)
		if err != nil {
			return nil, fmt.Errorf("scan chat message: %w", err)
		}

		if len(gradient) >= 2 {
			u.AvatarGradient = [2]string{gradient[0], gradient[1]}
		} else {
			u.AvatarGradient = [2]string{"#000000", "#000000"} // Default fallback
		}

		msg.User = &u
		messages = append(messages, &msg)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows chat messages: %w", err)
	}

	return messages, nil
}
