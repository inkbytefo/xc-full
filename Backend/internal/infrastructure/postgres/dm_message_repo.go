package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/dm"
)

// DMMessageRepository implements dm.MessageRepository using PostgreSQL.
type DMMessageRepository struct {
	pool *pgxpool.Pool
}

// NewDMMessageRepository creates a new DMMessageRepository.
func NewDMMessageRepository(pool *pgxpool.Pool) *DMMessageRepository {
	return &DMMessageRepository{pool: pool}
}

// FindByID finds a message by its ID.
func (r *DMMessageRepository) FindByID(ctx context.Context, id string) (*dm.Message, error) {
	query := `
		SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_edited, m.created_at, m.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM dm_messages m
		JOIN users u ON m.sender_id = u.id
		WHERE m.id = $1
	`

	var msg dm.Message
	var sender dm.ConversationUser
	var gradient []string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Content, &msg.IsEdited, &msg.CreatedAt, &msg.UpdatedAt,
		&sender.ID, &sender.Handle, &sender.DisplayName, &gradient,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, dm.ErrMessageNotFound
		}
		return nil, fmt.Errorf("query message by id: %w", err)
	}

	if len(gradient) >= 2 {
		sender.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	msg.Sender = &sender

	return &msg, nil
}

// FindByConversationID finds messages in a conversation with pagination.
func (r *DMMessageRepository) FindByConversationID(ctx context.Context, convID, cursor string, limit int) ([]*dm.Message, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var args []interface{}
	args = append(args, convID, limit+1)

	query := `
		SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_edited, m.created_at, m.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM dm_messages m
		JOIN users u ON m.sender_id = u.id
		WHERE m.conversation_id = $1
	`

	if cursor != "" {
		query += ` AND m.created_at < $3`
		args = append(args, cursor)
	}

	query += ` ORDER BY m.created_at DESC LIMIT $2`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("query messages: %w", err)
	}
	defer rows.Close()

	var messages []*dm.Message
	for rows.Next() {
		var msg dm.Message
		var sender dm.ConversationUser
		var gradient []string

		err := rows.Scan(
			&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Content, &msg.IsEdited, &msg.CreatedAt, &msg.UpdatedAt,
			&sender.ID, &sender.Handle, &sender.DisplayName, &gradient,
		)
		if err != nil {
			return nil, "", fmt.Errorf("scan message: %w", err)
		}

		if len(gradient) >= 2 {
			sender.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}
		msg.Sender = &sender

		messages = append(messages, &msg)
	}

	var nextCursor string
	if len(messages) > limit {
		nextCursor = messages[limit-1].CreatedAt.Format("2006-01-02T15:04:05.000000Z")
		messages = messages[:limit]
	}

	return messages, nextCursor, nil
}

// Create creates a new message.
func (r *DMMessageRepository) Create(ctx context.Context, msg *dm.Message) error {
	query := `
		INSERT INTO dm_messages (id, conversation_id, sender_id, content, is_edited, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.pool.Exec(ctx, query,
		msg.ID, msg.ConversationID, msg.SenderID, msg.Content, msg.IsEdited, msg.CreatedAt, msg.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert message: %w", err)
	}

	return nil
}

// Update updates a message.
func (r *DMMessageRepository) Update(ctx context.Context, msg *dm.Message) error {
	query := `UPDATE dm_messages SET content = $2, is_edited = TRUE, updated_at = NOW() WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, msg.ID, msg.Content)
	if err != nil {
		return fmt.Errorf("update message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return dm.ErrMessageNotFound
	}

	return nil
}

// Delete deletes a message.
func (r *DMMessageRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM dm_messages WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return dm.ErrMessageNotFound
	}

	return nil
}

// MarkAsRead marks messages as read up to a certain message.
func (r *DMMessageRepository) MarkAsRead(ctx context.Context, convID, userID, messageID string) error {
	query := `
		UPDATE conversation_participants 
		SET last_read_at = NOW() 
		WHERE conversation_id = $1 AND user_id = $2
	`

	_, err := r.pool.Exec(ctx, query, convID, userID)
	if err != nil {
		return fmt.Errorf("mark as read: %w", err)
	}

	return nil
}

// GetUnreadCount gets the unread message count for a user in a conversation.
func (r *DMMessageRepository) GetUnreadCount(ctx context.Context, convID, userID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM dm_messages m
		JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $2
		WHERE m.conversation_id = $1 
		  AND m.sender_id != $2
		  AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
	`

	var count int
	err := r.pool.QueryRow(ctx, query, convID, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get unread count: %w", err)
	}

	return count, nil
}
