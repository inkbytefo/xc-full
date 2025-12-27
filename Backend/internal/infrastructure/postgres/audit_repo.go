package postgres

import (
	"context"

	"xcord/internal/domain/server"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditLogRepository struct {
	db *pgxpool.Pool
}

func NewAuditLogRepository(db *pgxpool.Pool) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

func (r *AuditLogRepository) Create(ctx context.Context, log *server.AuditLog) error {
	query := `
		INSERT INTO audit_logs (id, server_id, actor_id, target_id, action_type, changes, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(ctx, query,
		log.ID,
		log.ServerID,
		log.ActorID,
		log.TargetID,
		log.ActionType,
		log.Changes,
		log.Reason,
		log.CreatedAt,
	)
	return err
}

func (r *AuditLogRepository) FindByServerID(ctx context.Context, serverID string, limit, offset int) ([]*server.AuditLog, error) {
	query := `
		SELECT id, server_id, actor_id, target_id, action_type, changes, reason, created_at
		FROM audit_logs
		WHERE server_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, serverID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*server.AuditLog
	for rows.Next() {
		log := &server.AuditLog{}
		var changes map[string]interface{}

		err := rows.Scan(
			&log.ID,
			&log.ServerID,
			&log.ActorID,
			&log.TargetID,
			&log.ActionType,
			&changes,
			&log.Reason,
			&log.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		log.Changes = changes
		logs = append(logs, log)
	}
	return logs, nil
}
