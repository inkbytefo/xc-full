// Package postgres provides PostgreSQL implementations of domain repositories.
package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/privacy"
)

// PrivacyRepository implements privacy.Repository using PostgreSQL.
type PrivacyRepository struct {
	pool *pgxpool.Pool
}

// NewPrivacyRepository creates a new PrivacyRepository.
func NewPrivacyRepository(pool *pgxpool.Pool) *PrivacyRepository {
	return &PrivacyRepository{pool: pool}
}

// FindByUserID retrieves privacy settings for a user.
func (r *PrivacyRepository) FindByUserID(ctx context.Context, userID string) (*privacy.Settings, error) {
	query := `
		SELECT user_id, online_status_visibility, dm_permission, profile_visibility,
		       show_activity, read_receipts_enabled, typing_indicators_enabled,
		       friend_request_permission, created_at, updated_at
		FROM privacy_settings
		WHERE user_id = $1
	`

	var s privacy.Settings
	var onlineVis, dmPerm, profileVis, friendReq string

	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&s.UserID,
		&onlineVis,
		&dmPerm,
		&profileVis,
		&s.ShowActivity,
		&s.ReadReceiptsEnabled,
		&s.TypingIndicatorsEnabled,
		&friendReq,
		&s.CreatedAt,
		&s.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, privacy.ErrNotFound
		}
		return nil, err
	}

	// Convert string values to typed enums
	s.OnlineStatusVisibility = privacy.OnlineVisibility(onlineVis)
	s.DMPermission = privacy.DMPermission(dmPerm)
	s.ProfileVisibility = privacy.ProfileVisibility(profileVis)
	s.FriendRequestPermission = privacy.FriendRequestPermission(friendReq)

	return &s, nil
}

// Upsert creates or updates privacy settings for a user.
func (r *PrivacyRepository) Upsert(ctx context.Context, settings *privacy.Settings) error {
	query := `
		INSERT INTO privacy_settings (
			user_id, online_status_visibility, dm_permission, profile_visibility,
			show_activity, read_receipts_enabled, typing_indicators_enabled,
			friend_request_permission, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id) DO UPDATE SET
			online_status_visibility = EXCLUDED.online_status_visibility,
			dm_permission = EXCLUDED.dm_permission,
			profile_visibility = EXCLUDED.profile_visibility,
			show_activity = EXCLUDED.show_activity,
			read_receipts_enabled = EXCLUDED.read_receipts_enabled,
			typing_indicators_enabled = EXCLUDED.typing_indicators_enabled,
			friend_request_permission = EXCLUDED.friend_request_permission,
			updated_at = NOW()
	`

	now := time.Now()
	if settings.CreatedAt.IsZero() {
		settings.CreatedAt = now
	}
	settings.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		settings.UserID,
		string(settings.OnlineStatusVisibility),
		string(settings.DMPermission),
		string(settings.ProfileVisibility),
		settings.ShowActivity,
		settings.ReadReceiptsEnabled,
		settings.TypingIndicatorsEnabled,
		string(settings.FriendRequestPermission),
		settings.CreatedAt,
		settings.UpdatedAt,
	)

	return err
}

// Delete removes privacy settings for a user.
func (r *PrivacyRepository) Delete(ctx context.Context, userID string) error {
	query := `DELETE FROM privacy_settings WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
