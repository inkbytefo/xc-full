package postgres

import (
	"context"
	"errors"
	"pink/internal/domain/readstate"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReadStateRepository struct {
	db *pgxpool.Pool
}

func NewReadStateRepository(db *pgxpool.Pool) *ReadStateRepository {
	return &ReadStateRepository{db: db}
}

func (r *ReadStateRepository) Upsert(ctx context.Context, rs *readstate.ReadState) error {
	query := `
		INSERT INTO read_states (user_id, channel_id, last_read_message_id, last_read_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, channel_id)
		DO UPDATE SET
			last_read_message_id = EXCLUDED.last_read_message_id,
			last_read_at = EXCLUDED.last_read_at
		RETURNING id
	`
	return r.db.QueryRow(ctx, query, rs.UserID, rs.ChannelID, rs.LastReadMessageID, rs.LastReadAt).Scan(&rs.ID)
}

func (r *ReadStateRepository) Get(ctx context.Context, userID, channelID string) (*readstate.ReadState, error) {
	query := `
		SELECT id, user_id, channel_id, last_read_message_id, last_read_at
		FROM read_states
		WHERE user_id = $1 AND channel_id = $2
	`
	var rs readstate.ReadState
	err := r.db.QueryRow(ctx, query, userID, channelID).Scan(
		&rs.ID, &rs.UserID, &rs.ChannelID, &rs.LastReadMessageID, &rs.LastReadAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // Return nil if no read state exists yet
		}
		return nil, err
	}
	return &rs, nil
}

func (r *ReadStateRepository) GetByChannelID(ctx context.Context, channelID string) ([]*readstate.ReadState, error) {
	query := `
		SELECT id, user_id, channel_id, last_read_message_id, last_read_at
		FROM read_states
		WHERE channel_id = $1
	`
	rows, err := r.db.Query(ctx, query, channelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var states []*readstate.ReadState
	for rows.Next() {
		var rs readstate.ReadState
		if err := rows.Scan(&rs.ID, &rs.UserID, &rs.ChannelID, &rs.LastReadMessageID, &rs.LastReadAt); err != nil {
			return nil, err
		}
		states = append(states, &rs)
	}
	return states, nil
}
