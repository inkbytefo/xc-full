package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/channel"
	"xcord/internal/domain/server"
)

// ============================================================================
// CHANNEL REPOSITORY
// ============================================================================

// ChannelRepository implements channel.Repository using PostgreSQL.
type ChannelRepository struct {
	pool *pgxpool.Pool
}

// NewChannelRepository creates a new ChannelRepository.
func NewChannelRepository(pool *pgxpool.Pool) *ChannelRepository {
	return &ChannelRepository{pool: pool}
}

// FindByID finds a channel by its ID.
func (r *ChannelRepository) FindByID(ctx context.Context, id string) (*channel.Channel, error) {
	query := `
		SELECT id, server_id, parent_id, name, description, type, position, is_private, 
		       user_limit, bitrate, livekit_room, created_at, updated_at
		FROM channels
		WHERE id = $1
	`

	var ch channel.Channel
	var desc, parentID, livekitRoom *string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&ch.ID,
		&ch.ServerID,
		&parentID,
		&ch.Name,
		&desc,
		&ch.Type,
		&ch.Position,
		&ch.IsPrivate,
		&ch.UserLimit,
		&ch.Bitrate,
		&livekitRoom,
		&ch.CreatedAt,
		&ch.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, channel.ErrNotFound
		}
		return nil, fmt.Errorf("query channel by id: %w", err)
	}

	if desc != nil {
		ch.Description = *desc
	}
	ch.ParentID = parentID
	if livekitRoom != nil {
		ch.LiveKitRoom = *livekitRoom
	}

	// Get participant count for voice-enabled channels
	if ch.Type.IsVoiceEnabled() {
		count, _ := r.getParticipantCount(ctx, id)
		ch.ParticipantCount = count
	}

	return &ch, nil
}

// FindByServerID finds all channels in a server.
func (r *ChannelRepository) FindByServerID(ctx context.Context, serverID string) ([]*channel.Channel, error) {
	query := `
		SELECT id, server_id, parent_id, name, description, type, position, is_private,
		       user_limit, bitrate, livekit_room, created_at, updated_at
		FROM channels
		WHERE server_id = $1
		ORDER BY position, created_at
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query channels by server id: %w", err)
	}
	defer rows.Close()

	var channels []*channel.Channel
	for rows.Next() {
		var ch channel.Channel
		var desc, parentID, livekitRoom *string

		err := rows.Scan(
			&ch.ID,
			&ch.ServerID,
			&parentID,
			&ch.Name,
			&desc,
			&ch.Type,
			&ch.Position,
			&ch.IsPrivate,
			&ch.UserLimit,
			&ch.Bitrate,
			&livekitRoom,
			&ch.CreatedAt,
			&ch.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan channel: %w", err)
		}

		if desc != nil {
			ch.Description = *desc
		}
		ch.ParentID = parentID
		if livekitRoom != nil {
			ch.LiveKitRoom = *livekitRoom
		}

		channels = append(channels, &ch)
	}

	return channels, nil
}

// FindCategories finds all category channels in a server.
func (r *ChannelRepository) FindCategories(ctx context.Context, serverID string) ([]*channel.Channel, error) {
	query := `
		SELECT id, server_id, parent_id, name, description, type, position, is_private, created_at, updated_at
		FROM channels
		WHERE server_id = $1 AND type = 'category'
		ORDER BY position, created_at
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query categories by server id: %w", err)
	}
	defer rows.Close()

	var categories []*channel.Channel
	for rows.Next() {
		var ch channel.Channel
		var desc, parentID *string

		err := rows.Scan(
			&ch.ID,
			&ch.ServerID,
			&parentID,
			&ch.Name,
			&desc,
			&ch.Type,
			&ch.Position,
			&ch.IsPrivate,
			&ch.CreatedAt,
			&ch.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}

		if desc != nil {
			ch.Description = *desc
		}
		ch.ParentID = parentID

		categories = append(categories, &ch)
	}

	return categories, nil
}

// Create creates a new channel.
func (r *ChannelRepository) Create(ctx context.Context, ch *channel.Channel) error {
	query := `
		INSERT INTO channels (
			id, server_id, parent_id, name, description, type, position, is_private,
			user_limit, bitrate, livekit_room, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	var desc, livekitRoom *string
	if ch.Description != "" {
		desc = &ch.Description
	}
	if ch.LiveKitRoom != "" {
		livekitRoom = &ch.LiveKitRoom
	}

	_, err := r.pool.Exec(ctx, query,
		ch.ID,
		ch.ServerID,
		ch.ParentID,
		ch.Name,
		desc,
		ch.Type,
		ch.Position,
		ch.IsPrivate,
		ch.UserLimit,
		ch.Bitrate,
		livekitRoom,
		ch.CreatedAt,
		ch.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert channel: %w", err)
	}

	return nil
}

// Update updates an existing channel.
func (r *ChannelRepository) Update(ctx context.Context, ch *channel.Channel) error {
	query := `
		UPDATE channels SET
			parent_id = $2,
			name = $3,
			description = $4,
			type = $5,
			position = $6,
			is_private = $7,
			user_limit = $8,
			bitrate = $9,
			livekit_room = $10,
			updated_at = NOW()
		WHERE id = $1
	`

	var desc, livekitRoom *string
	if ch.Description != "" {
		desc = &ch.Description
	}
	if ch.LiveKitRoom != "" {
		livekitRoom = &ch.LiveKitRoom
	}

	result, err := r.pool.Exec(ctx, query,
		ch.ID,
		ch.ParentID,
		ch.Name,
		desc,
		ch.Type,
		ch.Position,
		ch.IsPrivate,
		ch.UserLimit,
		ch.Bitrate,
		livekitRoom,
	)

	if err != nil {
		return fmt.Errorf("update channel: %w", err)
	}

	if result.RowsAffected() == 0 {
		return channel.ErrNotFound
	}

	return nil
}

// Delete deletes a channel by its ID.
func (r *ChannelRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM channels WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete channel: %w", err)
	}

	if result.RowsAffected() == 0 {
		return channel.ErrNotFound
	}

	return nil
}

// ReorderChannels updates channel positions.
func (r *ChannelRepository) ReorderChannels(ctx context.Context, serverID string, positions map[string]int) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	query := `UPDATE channels SET position = $2 WHERE id = $1 AND server_id = $3`

	for channelID, position := range positions {
		_, err := tx.Exec(ctx, query, channelID, position, serverID)
		if err != nil {
			return fmt.Errorf("update channel position: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// FindVoiceEnabled finds all voice-enabled channels in a server.
func (r *ChannelRepository) FindVoiceEnabled(ctx context.Context, serverID string) ([]*channel.Channel, error) {
	query := `
		SELECT id, server_id, parent_id, name, description, type, position, is_private,
		       user_limit, bitrate, livekit_room, created_at, updated_at
		FROM channels
		WHERE server_id = $1 AND type IN ('voice', 'video', 'stage', 'hybrid')
		ORDER BY position, created_at
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query voice-enabled channels: %w", err)
	}
	defer rows.Close()

	var channels []*channel.Channel
	for rows.Next() {
		var ch channel.Channel
		var desc, parentID, livekitRoom *string

		err := rows.Scan(
			&ch.ID,
			&ch.ServerID,
			&parentID,
			&ch.Name,
			&desc,
			&ch.Type,
			&ch.Position,
			&ch.IsPrivate,
			&ch.UserLimit,
			&ch.Bitrate,
			&livekitRoom,
			&ch.CreatedAt,
			&ch.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan voice channel: %w", err)
		}

		if desc != nil {
			ch.Description = *desc
		}
		ch.ParentID = parentID
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

// UpdateLiveKitRoom updates the LiveKit room name for a channel.
func (r *ChannelRepository) UpdateLiveKitRoom(ctx context.Context, id, roomName string) error {
	query := `UPDATE channels SET livekit_room = $2, updated_at = NOW() WHERE id = $1`

	var room *string
	if roomName != "" {
		room = &roomName
	}

	result, err := r.pool.Exec(ctx, query, id, room)
	if err != nil {
		return fmt.Errorf("update livekit room: %w", err)
	}

	if result.RowsAffected() == 0 {
		return channel.ErrNotFound
	}

	return nil
}

// getParticipantCount gets the number of participants in a voice channel.
func (r *ChannelRepository) getParticipantCount(ctx context.Context, channelID string) (int, error) {
	query := `SELECT COUNT(*) FROM voice_participants WHERE channel_id = $1`

	var count int
	err := r.pool.QueryRow(ctx, query, channelID).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// ============================================================================
// OVERWRITE REPOSITORY
// ============================================================================

// OverwriteRepository implements channel.OverwriteRepository using PostgreSQL.
type OverwriteRepository struct {
	pool *pgxpool.Pool
}

// NewOverwriteRepository creates a new OverwriteRepository.
func NewOverwriteRepository(pool *pgxpool.Pool) *OverwriteRepository {
	return &OverwriteRepository{pool: pool}
}

// FindByChannelID finds all overwrites for a channel.
func (r *OverwriteRepository) FindByChannelID(ctx context.Context, channelID string) ([]channel.PermissionOverwrite, error) {
	query := `
		SELECT id, channel_id, target_type, target_id, allow, deny
		FROM permission_overwrites
		WHERE channel_id = $1
	`

	rows, err := r.pool.Query(ctx, query, channelID)
	if err != nil {
		return nil, fmt.Errorf("query overwrites by channel id: %w", err)
	}
	defer rows.Close()

	var overwrites []channel.PermissionOverwrite
	for rows.Next() {
		var ow channel.PermissionOverwrite
		err := rows.Scan(&ow.ID, &ow.ChannelID, &ow.TargetType, &ow.TargetID, &ow.Allow, &ow.Deny)
		if err != nil {
			return nil, fmt.Errorf("scan overwrite: %w", err)
		}
		overwrites = append(overwrites, ow)
	}

	return overwrites, nil
}

// FindByChannelIDs finds overwrites for multiple channels (batch).
func (r *OverwriteRepository) FindByChannelIDs(ctx context.Context, channelIDs []string) (map[string][]channel.PermissionOverwrite, error) {
	if len(channelIDs) == 0 {
		return make(map[string][]channel.PermissionOverwrite), nil
	}

	query := `
		SELECT id, channel_id, target_type, target_id, allow, deny
		FROM permission_overwrites
		WHERE channel_id = ANY($1)
	`

	rows, err := r.pool.Query(ctx, query, channelIDs)
	if err != nil {
		return nil, fmt.Errorf("query overwrites by channel ids: %w", err)
	}
	defer rows.Close()

	result := make(map[string][]channel.PermissionOverwrite)
	for rows.Next() {
		var ow channel.PermissionOverwrite
		err := rows.Scan(&ow.ID, &ow.ChannelID, &ow.TargetType, &ow.TargetID, &ow.Allow, &ow.Deny)
		if err != nil {
			return nil, fmt.Errorf("scan overwrite: %w", err)
		}
		result[ow.ChannelID] = append(result[ow.ChannelID], ow)
	}

	return result, nil
}

// Create creates a new overwrite.
func (r *OverwriteRepository) Create(ctx context.Context, overwrite *channel.PermissionOverwrite) error {
	query := `
		INSERT INTO permission_overwrites (id, channel_id, target_type, target_id, allow, deny)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.pool.Exec(ctx, query,
		overwrite.ID, overwrite.ChannelID, overwrite.TargetType, overwrite.TargetID, overwrite.Allow, overwrite.Deny,
	)

	if err != nil {
		return fmt.Errorf("insert overwrite: %w", err)
	}

	return nil
}

// Update updates an existing overwrite.
func (r *OverwriteRepository) Update(ctx context.Context, overwrite *channel.PermissionOverwrite) error {
	query := `
		UPDATE permission_overwrites SET
			allow = $2,
			deny = $3
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, overwrite.ID, overwrite.Allow, overwrite.Deny)
	if err != nil {
		return fmt.Errorf("update overwrite: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("overwrite not found")
	}

	return nil
}

// Delete deletes an overwrite by its ID.
func (r *OverwriteRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM permission_overwrites WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete overwrite: %w", err)
	}

	return nil
}

// DeleteByChannelAndTarget deletes an overwrite by channel/target combination.
func (r *OverwriteRepository) DeleteByChannelAndTarget(ctx context.Context, channelID string, targetType channel.OverwriteTargetType, targetID string) error {
	query := `DELETE FROM permission_overwrites WHERE channel_id = $1 AND target_type = $2 AND target_id = $3`

	_, err := r.pool.Exec(ctx, query, channelID, targetType, targetID)
	if err != nil {
		return fmt.Errorf("delete overwrite by target: %w", err)
	}

	return nil
}

// ============================================================================
// HELPER: Check ownership for permission checks
// ============================================================================

// IsServerOwner checks if a user is the owner of a server.
func IsServerOwner(srv *server.Server, userID string) bool {
	return srv.OwnerID == userID
}
