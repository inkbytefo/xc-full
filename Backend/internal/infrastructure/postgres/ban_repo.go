package postgres

import (
	"context"

	"xcord/internal/domain/server"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BanRepository struct {
	db *pgxpool.Pool
}

func NewBanRepository(db *pgxpool.Pool) *BanRepository {
	return &BanRepository{db: db}
}

func (r *BanRepository) Create(ctx context.Context, ban *server.Ban) error {
	query := `
		INSERT INTO server_bans (id, server_id, user_id, banned_by, reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(ctx, query,
		ban.ID,
		ban.ServerID,
		ban.UserID,
		ban.BannedBy,
		ban.Reason,
		ban.CreatedAt,
		ban.UpdatedAt,
	)
	return err
}

func (r *BanRepository) Delete(ctx context.Context, serverID, userID string) error {
	query := `DELETE FROM server_bans WHERE server_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, serverID, userID)
	return err
}

func (r *BanRepository) Find(ctx context.Context, serverID, userID string) (*server.Ban, error) {
	query := `
		SELECT id, server_id, user_id, banned_by, reason, created_at, updated_at
		FROM server_bans
		WHERE server_id = $1 AND user_id = $2
	`
	ban := &server.Ban{}
	err := r.db.QueryRow(ctx, query, serverID, userID).Scan(
		&ban.ID,
		&ban.ServerID,
		&ban.UserID,
		&ban.BannedBy,
		&ban.Reason,
		&ban.CreatedAt,
		&ban.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return ban, nil
}

func (r *BanRepository) FindByServerID(ctx context.Context, serverID string) ([]*server.Ban, error) {
	query := `
		SELECT id, server_id, user_id, banned_by, reason, created_at, updated_at
		FROM server_bans
		WHERE server_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query, serverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bans []*server.Ban
	for rows.Next() {
		ban := &server.Ban{}
		err := rows.Scan(
			&ban.ID,
			&ban.ServerID,
			&ban.UserID,
			&ban.BannedBy,
			&ban.Reason,
			&ban.CreatedAt,
			&ban.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		bans = append(bans, ban)
	}
	return bans, nil
}

func (r *BanRepository) IsBanned(ctx context.Context, serverID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM server_bans WHERE server_id = $1 AND user_id = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, serverID, userID).Scan(&exists)
	return exists, err
}
