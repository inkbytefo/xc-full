package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/notification"
)

// NotificationRepository implements notification.Repository using PostgreSQL.
type NotificationRepository struct {
	pool *pgxpool.Pool
}

// NewNotificationRepository creates a new NotificationRepository.
func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{pool: pool}
}

// FindByID finds a notification by its ID.
func (r *NotificationRepository) FindByID(ctx context.Context, id string) (*notification.Notification, error) {
	query := `
		SELECT n.id, n.user_id, n.type, n.actor_id, n.target_type, n.target_id, n.message, n.is_read, n.created_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM notifications n
		LEFT JOIN users u ON n.actor_id = u.id
		WHERE n.id = $1
	`

	var notif notification.Notification
	var actor notification.ActorInfo
	var actorID *string
	var gradient []string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&notif.ID, &notif.UserID, &notif.Type, &actorID, &notif.TargetType, &notif.TargetID, &notif.Message, &notif.IsRead, &notif.CreatedAt,
		&actor.ID, &actor.Handle, &actor.DisplayName, &gradient,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, notification.ErrNotFound
		}
		return nil, fmt.Errorf("query notification by id: %w", err)
	}

	notif.ActorID = actorID
	if actorID != nil {
		if len(gradient) >= 2 {
			actor.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}
		notif.Actor = &actor
	}

	return &notif, nil
}

// FindByUserID finds notifications for a user with pagination.
func (r *NotificationRepository) FindByUserID(ctx context.Context, userID, cursor string, limit int) ([]*notification.Notification, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var args []interface{}
	args = append(args, userID, limit+1)

	query := `
		SELECT n.id, n.user_id, n.type, n.actor_id, n.target_type, n.target_id, n.message, n.is_read, n.created_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM notifications n
		LEFT JOIN users u ON n.actor_id = u.id
		WHERE n.user_id = $1
	`

	if cursor != "" {
		query += ` AND n.created_at < $3`
		args = append(args, cursor)
	}

	query += ` ORDER BY n.created_at DESC LIMIT $2`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("query notifications: %w", err)
	}
	defer rows.Close()

	var notifications []*notification.Notification
	for rows.Next() {
		var notif notification.Notification
		var actor notification.ActorInfo
		var actorID *string
		var gradient []string

		err := rows.Scan(
			&notif.ID, &notif.UserID, &notif.Type, &actorID, &notif.TargetType, &notif.TargetID, &notif.Message, &notif.IsRead, &notif.CreatedAt,
			&actor.ID, &actor.Handle, &actor.DisplayName, &gradient,
		)
		if err != nil {
			return nil, "", fmt.Errorf("scan notification: %w", err)
		}

		notif.ActorID = actorID
		if actorID != nil {
			if len(gradient) >= 2 {
				actor.AvatarGradient = [2]string{gradient[0], gradient[1]}
			}
			notif.Actor = &actor
		}

		notifications = append(notifications, &notif)
	}

	var nextCursor string
	if len(notifications) > limit {
		nextCursor = notifications[limit-1].CreatedAt.Format("2006-01-02T15:04:05.000000Z")
		notifications = notifications[:limit]
	}

	return notifications, nextCursor, nil
}

// GetUnreadCount gets the unread notification count for a user.
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	query := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`

	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get unread count: %w", err)
	}

	return count, nil
}

// Create creates a new notification.
func (r *NotificationRepository) Create(ctx context.Context, notif *notification.Notification) error {
	query := `
		INSERT INTO notifications (id, user_id, type, actor_id, target_type, target_id, message, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.pool.Exec(ctx, query,
		notif.ID, notif.UserID, notif.Type, notif.ActorID, notif.TargetType, notif.TargetID, notif.Message, notif.IsRead, notif.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert notification: %w", err)
	}

	return nil
}

// MarkAsRead marks a notification as read.
func (r *NotificationRepository) MarkAsRead(ctx context.Context, id string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("mark as read: %w", err)
	}

	if result.RowsAffected() == 0 {
		return notification.ErrNotFound
	}

	return nil
}

// MarkAllAsRead marks all notifications as read for a user.
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`

	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("mark all as read: %w", err)
	}

	return nil
}

// Delete deletes a notification.
func (r *NotificationRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM notifications WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete notification: %w", err)
	}

	if result.RowsAffected() == 0 {
		return notification.ErrNotFound
	}

	return nil
}

// DeleteOldNotifications deletes notifications older than the given days.
func (r *NotificationRepository) DeleteOldNotifications(ctx context.Context, userID string, olderThanDays int) error {
	query := `DELETE FROM notifications WHERE user_id = $1 AND created_at < NOW() - INTERVAL '1 day' * $2`

	_, err := r.pool.Exec(ctx, query, userID, olderThanDays)
	if err != nil {
		return fmt.Errorf("delete old notifications: %w", err)
	}

	return nil
}
