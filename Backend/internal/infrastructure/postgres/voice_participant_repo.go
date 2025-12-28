package postgres

import (
	"context"
	"fmt"

	"pink/internal/domain/voice"

	"github.com/jackc/pgx/v5/pgxpool"
)

// VoiceParticipantRepository implements voice.ParticipantRepository using PostgreSQL.
type VoiceParticipantRepository struct {
	pool *pgxpool.Pool
}

// NewVoiceParticipantRepository creates a new VoiceParticipantRepository.
func NewVoiceParticipantRepository(pool *pgxpool.Pool) *VoiceParticipantRepository {
	return &VoiceParticipantRepository{pool: pool}
}

func (r *VoiceParticipantRepository) FindByChannelID(ctx context.Context, channelID string) ([]*voice.Participant, error) {
	query := `
		SELECT p.user_id, p.channel_id, p.is_muted, p.is_deafened, p.is_video_on, p.is_screening, p.joined_at,
		       u.handle, u.display_name, u.avatar_gradient
		FROM voice_participants p
		JOIN users u ON p.user_id = u.id
		WHERE p.channel_id = $1
		ORDER BY p.joined_at ASC
	`

	rows, err := r.pool.Query(ctx, query, channelID)
	if err != nil {
		return nil, fmt.Errorf("query voice participants: %w", err)
	}
	defer rows.Close()

	var participants []*voice.Participant
	for rows.Next() {
		var p voice.Participant
		err := rows.Scan(
			&p.UserID, &p.ChannelID, &p.IsMuted, &p.IsDeafened, &p.IsVideoOn, &p.IsScreening, &p.JoinedAt,
			&p.Handle, &p.DisplayName, &p.AvatarGradient,
		)
		if err != nil {
			return nil, fmt.Errorf("scan voice participant: %w", err)
		}
		participants = append(participants, &p)
	}

	return participants, nil
}

func (r *VoiceParticipantRepository) FindByUserID(ctx context.Context, userID string) (*voice.Participant, error) {
	query := `
		SELECT p.user_id, p.channel_id, p.is_muted, p.is_deafened, p.is_video_on, p.is_screening, p.joined_at,
		       u.handle, u.display_name, u.avatar_gradient
		FROM voice_participants p
		JOIN users u ON p.user_id = u.id
		WHERE p.user_id = $1
	`

	var p voice.Participant
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.ChannelID, &p.IsMuted, &p.IsDeafened, &p.IsVideoOn, &p.IsScreening, &p.JoinedAt,
		&p.Handle, &p.DisplayName, &p.AvatarGradient,
	)
	if err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *VoiceParticipantRepository) Join(ctx context.Context, p *voice.Participant) error {
	query := `
		INSERT INTO voice_participants (user_id, channel_id, is_muted, is_deafened, is_video_on, is_screening, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE 
		SET channel_id = EXCLUDED.channel_id, joined_at = EXCLUDED.joined_at
	`

	_, err := r.pool.Exec(ctx, query,
		p.UserID, p.ChannelID, p.IsMuted, p.IsDeafened, p.IsVideoOn, p.IsScreening, p.JoinedAt,
	)
	if err != nil {
		return fmt.Errorf("join voice channel: %w", err)
	}

	return nil
}

func (r *VoiceParticipantRepository) Leave(ctx context.Context, userID string) error {
	query := `DELETE FROM voice_participants WHERE user_id = $1`

	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("leave voice channel: %w", err)
	}

	return nil
}

func (r *VoiceParticipantRepository) UpdateState(ctx context.Context, userID string, isMuted, isDeafened, isVideoOn bool) error {
	query := `
		UPDATE voice_participants 
		SET is_muted = $2, is_deafened = $3, is_video_on = $4
		WHERE user_id = $1
	`

	_, err := r.pool.Exec(ctx, query, userID, isMuted, isDeafened, isVideoOn)
	if err != nil {
		return fmt.Errorf("update voice participant state: %w", err)
	}

	return nil
}

func (r *VoiceParticipantRepository) GetChannelParticipantCount(ctx context.Context, channelID string) (int, error) {
	query := `SELECT COUNT(*) FROM voice_participants WHERE channel_id = $1`

	var count int
	err := r.pool.QueryRow(ctx, query, channelID).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (r *VoiceParticipantRepository) DeleteByChannelID(ctx context.Context, channelID string) error {
	query := `DELETE FROM voice_participants WHERE channel_id = $1`

	_, err := r.pool.Exec(ctx, query, channelID)
	if err != nil {
		return fmt.Errorf("delete participants by channel: %w", err)
	}

	return nil
}

func (r *VoiceParticipantRepository) FindByServerID(ctx context.Context, serverID string) ([]*voice.Participant, error) {
	query := `
		SELECT p.user_id, p.channel_id, p.is_muted, p.is_deafened, p.is_video_on, p.is_screening, p.joined_at,
		       u.handle, u.display_name, u.avatar_gradient
		FROM voice_participants p
		JOIN channels c ON p.channel_id = c.id
		JOIN users u ON p.user_id = u.id
		WHERE c.server_id = $1
		ORDER BY p.joined_at ASC
	`

	rows, err := r.pool.Query(ctx, query, serverID)
	if err != nil {
		return nil, fmt.Errorf("query voice participants by server: %w", err)
	}
	defer rows.Close()

	var participants []*voice.Participant
	for rows.Next() {
		var p voice.Participant
		err := rows.Scan(
			&p.UserID, &p.ChannelID, &p.IsMuted, &p.IsDeafened, &p.IsVideoOn, &p.IsScreening, &p.JoinedAt,
			&p.Handle, &p.DisplayName, &p.AvatarGradient,
		)
		if err != nil {
			return nil, fmt.Errorf("scan voice participant: %w", err)
		}
		participants = append(participants, &p)
	}

	return participants, nil
}
