package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/channel"
)

// ChannelMessageRepository implements channel.MessageRepository using PostgreSQL.
type ChannelMessageRepository struct {
	pool *pgxpool.Pool
}

// NewChannelMessageRepository creates a new ChannelMessageRepository.
func NewChannelMessageRepository(pool *pgxpool.Pool) *ChannelMessageRepository {
	return &ChannelMessageRepository{pool: pool}
}

// FindByID finds a message by its ID.
func (r *ChannelMessageRepository) FindByID(ctx context.Context, id string) (*channel.ChannelMessage, error) {
	query := `
		SELECT m.id, m.channel_id, m.server_id, m.author_id, m.content, m.is_edited, m.is_pinned, m.reply_to_id, m.created_at, m.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM channel_messages m
		JOIN users u ON m.author_id = u.id
		WHERE m.id = $1
	`

	var msg channel.ChannelMessage
	var author channel.MessageAuthor
	var gradient []string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&msg.ID, &msg.ChannelID, &msg.ServerID, &msg.AuthorID, &msg.Content, &msg.IsEdited, &msg.IsPinned, &msg.ReplyToID, &msg.CreatedAt, &msg.UpdatedAt,
		&author.ID, &author.Handle, &author.DisplayName, &gradient,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, channel.ErrMessageNotFound
		}
		return nil, fmt.Errorf("query message by id: %w", err)
	}

	if len(gradient) >= 2 {
		author.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	msg.Author = &author

	return &msg, nil
}

// FindByChannelID finds messages in a channel with pagination.
func (r *ChannelMessageRepository) FindByChannelID(ctx context.Context, channelID, cursor string, limit int) ([]*channel.ChannelMessage, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var args []interface{}
	args = append(args, channelID, limit+1)

	query := `
		SELECT m.id, m.channel_id, m.server_id, m.author_id, m.content, m.is_edited, m.is_pinned, m.reply_to_id, m.created_at, m.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM channel_messages m
		JOIN users u ON m.author_id = u.id
		WHERE m.channel_id = $1
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

	var messages []*channel.ChannelMessage
	for rows.Next() {
		var msg channel.ChannelMessage
		var author channel.MessageAuthor
		var gradient []string

		err := rows.Scan(
			&msg.ID, &msg.ChannelID, &msg.ServerID, &msg.AuthorID, &msg.Content, &msg.IsEdited, &msg.IsPinned, &msg.ReplyToID, &msg.CreatedAt, &msg.UpdatedAt,
			&author.ID, &author.Handle, &author.DisplayName, &gradient,
		)
		if err != nil {
			return nil, "", fmt.Errorf("scan message: %w", err)
		}

		if len(gradient) >= 2 {
			author.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}
		msg.Author = &author

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
func (r *ChannelMessageRepository) Create(ctx context.Context, msg *channel.ChannelMessage) error {
	query := `
		INSERT INTO channel_messages (id, channel_id, server_id, author_id, content, is_edited, is_pinned, reply_to_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.pool.Exec(ctx, query,
		msg.ID, msg.ChannelID, msg.ServerID, msg.AuthorID, msg.Content, msg.IsEdited, msg.IsPinned, msg.ReplyToID, msg.CreatedAt, msg.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert message: %w", err)
	}

	return nil
}

// Update updates a message.
func (r *ChannelMessageRepository) Update(ctx context.Context, msg *channel.ChannelMessage) error {
	query := `UPDATE channel_messages SET content = $2, is_edited = TRUE, updated_at = NOW() WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, msg.ID, msg.Content)
	if err != nil {
		return fmt.Errorf("update message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return channel.ErrMessageNotFound
	}

	return nil
}

// Delete deletes a message by its ID.
func (r *ChannelMessageRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM channel_messages WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return channel.ErrMessageNotFound
	}

	return nil
}

// Search searches messages in a channel.
func (r *ChannelMessageRepository) Search(ctx context.Context, channelID, query string, limit int) ([]*channel.ChannelMessage, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	sqlQuery := `
		SELECT m.id, m.channel_id, m.server_id, m.author_id, m.content, m.is_edited, m.is_pinned, m.reply_to_id, m.created_at, m.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM channel_messages m
		JOIN users u ON m.author_id = u.id
		WHERE m.channel_id = $1 AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
		ORDER BY m.created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, sqlQuery, channelID, query, limit)
	if err != nil {
		return nil, fmt.Errorf("search messages: %w", err)
	}
	defer rows.Close()

	var messages []*channel.ChannelMessage
	for rows.Next() {
		var msg channel.ChannelMessage
		var author channel.MessageAuthor
		var gradient []string

		err := rows.Scan(
			&msg.ID, &msg.ChannelID, &msg.ServerID, &msg.AuthorID, &msg.Content, &msg.IsEdited, &msg.IsPinned, &msg.ReplyToID, &msg.CreatedAt, &msg.UpdatedAt,
			&author.ID, &author.Handle, &author.DisplayName, &gradient,
		)
		if err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}

		if len(gradient) >= 2 {
			author.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}
		msg.Author = &author

		messages = append(messages, &msg)
	}

	return messages, nil
}
