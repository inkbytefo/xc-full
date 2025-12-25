package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/user"
)

// SessionRepository implements user.SessionRepository using PostgreSQL.
type SessionRepository struct {
	pool *pgxpool.Pool
}

// NewSessionRepository creates a new SessionRepository.
func NewSessionRepository(pool *pgxpool.Pool) *SessionRepository {
	return &SessionRepository{pool: pool}
}

// Create creates a new session.
func (r *SessionRepository) Create(ctx context.Context, s *user.Session) error {
	query := `
		INSERT INTO user_sessions (
			id, user_id, refresh_token, device_info, ip_address,
			expires_at, created_at
		) VALUES ($1, $2, $3, $4, $5::inet, $6, $7)
	`

	var ipAddr *string
	if s.IPAddress != "" {
		ipAddr = &s.IPAddress
	}

	_, err := r.pool.Exec(ctx, query,
		s.ID,
		s.UserID,
		s.RefreshToken,
		s.DeviceInfo,
		ipAddr,
		s.ExpiresAt,
		s.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}

	return nil
}

// FindByRefreshToken finds a session by its refresh token.
func (r *SessionRepository) FindByRefreshToken(ctx context.Context, refreshToken string) (*user.Session, error) {
	query := `
		SELECT id, user_id, refresh_token, device_info, ip_address,
		       expires_at, created_at
		FROM user_sessions
		WHERE refresh_token = $1
	`

	var s user.Session
	var ipAddr *string

	err := r.pool.QueryRow(ctx, query, refreshToken).Scan(
		&s.ID,
		&s.UserID,
		&s.RefreshToken,
		&s.DeviceInfo,
		&ipAddr,
		&s.ExpiresAt,
		&s.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, user.ErrSessionNotFound
		}
		return nil, fmt.Errorf("query session by refresh token: %w", err)
	}

	if ipAddr != nil {
		s.IPAddress = *ipAddr
	}

	return &s, nil
}

// FindByUserID finds all sessions for a user.
func (r *SessionRepository) FindByUserID(ctx context.Context, userID string) ([]*user.Session, error) {
	query := `
		SELECT id, user_id, refresh_token, device_info, ip_address,
		       expires_at, created_at
		FROM user_sessions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query sessions by user id: %w", err)
	}
	defer rows.Close()

	var sessions []*user.Session
	for rows.Next() {
		var s user.Session
		var ipAddr *string

		err := rows.Scan(
			&s.ID,
			&s.UserID,
			&s.RefreshToken,
			&s.DeviceInfo,
			&ipAddr,
			&s.ExpiresAt,
			&s.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}

		if ipAddr != nil {
			s.IPAddress = *ipAddr
		}

		sessions = append(sessions, &s)
	}

	return sessions, nil
}

// Delete deletes a session by its ID.
func (r *SessionRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM user_sessions WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrSessionNotFound
	}

	return nil
}

// DeleteByRefreshToken deletes a session by its refresh token.
func (r *SessionRepository) DeleteByRefreshToken(ctx context.Context, refreshToken string) error {
	query := `DELETE FROM user_sessions WHERE refresh_token = $1`

	result, err := r.pool.Exec(ctx, query, refreshToken)
	if err != nil {
		return fmt.Errorf("delete session by refresh token: %w", err)
	}

	if result.RowsAffected() == 0 {
		return user.ErrSessionNotFound
	}

	return nil
}

// DeleteByUserID deletes all sessions for a user.
func (r *SessionRepository) DeleteByUserID(ctx context.Context, userID string) error {
	query := `DELETE FROM user_sessions WHERE user_id = $1`

	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("delete sessions by user id: %w", err)
	}

	return nil
}

// DeleteExpired deletes all expired sessions.
func (r *SessionRepository) DeleteExpired(ctx context.Context) (int64, error) {
	query := `DELETE FROM user_sessions WHERE expires_at < $1`

	result, err := r.pool.Exec(ctx, query, time.Now())
	if err != nil {
		return 0, fmt.Errorf("delete expired sessions: %w", err)
	}

	return result.RowsAffected(), nil
}
