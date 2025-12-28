package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/voice"
)

// VoiceChannelRepository implements voice.ChannelRepository using PostgreSQL.
type VoiceChannelRepository struct {
	pool *pgxpool.Pool
}

// NewVoiceChannelRepository creates a new VoiceChannelRepository.
func NewVoiceChannelRepository(pool *pgxpool.Pool) *VoiceChannelRepository {
	return &VoiceChannelRepository{pool: pool}
}

// FindByID finds a voice channel by its ID.
func (r *VoiceChannelRepository) FindByID(ctx context.Context, id string) (*voice.VoiceChannel, error) {
	query := `
		SELECT id, server_id, name, type, position, user_limit, bitrate, livekit_room, created_at, updated_at
		FROM voice_channels
		WHERE id = $1
	`

	var ch voice.VoiceChannel
	var livekitRoom *string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&ch.ID, &ch.ServerID, &ch.Name, &ch.Type, &ch.Position, &ch.UserLimit, &ch.Bitrate, &livekitRoom, &ch.CreatedAt, &ch.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, voice.ErrChannelNotFound
		}
		return nil, fmt.Errorf("query voice channel by id: %w", err)
	}

	if livekitRoom != nil {
		ch.LiveKitRoom = *livekitRoom
	}

	// Get participant count
	count, _ := r.getParticipantCount(ctx, id)
	ch.ParticipantCount = count

	return &ch, nil
}

// FindByServerID finds all voice channels in a server.
func (r *VoiceChannelRepository) FindByServerID(ctx context.Context, serverID string) ([]*voice.VoiceChannel, error) {
	query := `
		SELECT id, server_id, name, type, position, user_limit, bitrate, livekit_room, created_at, updated_at
		FROM voice_channels
		WHERE server_id = $1
		ORDER BY position ASC
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query voice channels: %w", err)
	}
	defer rows.Close()

	var channels []*voice.VoiceChannel
	for rows.Next() {
		var ch voice.VoiceChannel
		var livekitRoom *string

		err := rows.Scan(&ch.ID, &ch.ServerID, &ch.Name, &ch.Type, &ch.Position, &ch.UserLimit, &ch.Bitrate, &livekitRoom, &ch.CreatedAt, &ch.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan voice channel: %w", err)
		}

		if livekitRoom != nil {
			ch.LiveKitRoom = *livekitRoom
		}

		// Get participant count
		count, _ := r.getParticipantCount(ctx, ch.ID)
		ch.ParticipantCount = count

		channels = append(channels, &ch)
	}

	return channels, nil
}

// Create creates a new voice channel.
func (r *VoiceChannelRepository) Create(ctx context.Context, ch *voice.VoiceChannel) error {
	query := `
		INSERT INTO voice_channels (id, server_id, name, type, position, user_limit, bitrate, livekit_room, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	var livekitRoom *string
	if ch.LiveKitRoom != "" {
		livekitRoom = &ch.LiveKitRoom
	}

	_, err := r.pool.Exec(ctx, query,
		ch.ID, ch.ServerID, ch.Name, ch.Type, ch.Position, ch.UserLimit, ch.Bitrate, livekitRoom, ch.CreatedAt, ch.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert voice channel: %w", err)
	}

	return nil
}

// Update updates a voice channel.
func (r *VoiceChannelRepository) Update(ctx context.Context, ch *voice.VoiceChannel) error {
	query := `
		UPDATE voice_channels 
		SET name = $2, type = $3, user_limit = $4, bitrate = $5, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, ch.ID, ch.Name, ch.Type, ch.UserLimit, ch.Bitrate)
	if err != nil {
		return fmt.Errorf("update voice channel: %w", err)
	}

	if result.RowsAffected() == 0 {
		return voice.ErrChannelNotFound
	}

	return nil
}

// Delete deletes a voice channel.
func (r *VoiceChannelRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM voice_channels WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete voice channel: %w", err)
	}

	if result.RowsAffected() == 0 {
		return voice.ErrChannelNotFound
	}

	return nil
}

// UpdatePosition updates channel position.
func (r *VoiceChannelRepository) UpdatePosition(ctx context.Context, id string, position int) error {
	query := `UPDATE voice_channels SET position = $2, updated_at = NOW() WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id, position)
	if err != nil {
		return fmt.Errorf("update position: %w", err)
	}

	return nil
}

func (r *VoiceChannelRepository) getParticipantCount(ctx context.Context, channelID string) (int, error) {
	query := `SELECT COUNT(*) FROM voice_participants WHERE channel_id = $1`

	var count int
	err := r.pool.QueryRow(ctx, query, channelID).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}
