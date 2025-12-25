package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/dm"
)

// ConversationRepository implements dm.ConversationRepository using PostgreSQL.
type ConversationRepository struct {
	pool *pgxpool.Pool
}

// NewConversationRepository creates a new ConversationRepository.
func NewConversationRepository(pool *pgxpool.Pool) *ConversationRepository {
	return &ConversationRepository{pool: pool}
}

// FindByID finds a conversation by its ID.
func (r *ConversationRepository) FindByID(ctx context.Context, id string) (*dm.Conversation, error) {
	query := `
		SELECT c.id, c.created_at, c.updated_at
		FROM conversations c
		WHERE c.id = $1
	`

	var conv dm.Conversation
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&conv.ID, &conv.CreatedAt, &conv.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, dm.ErrConversationNotFound
		}
		return nil, fmt.Errorf("query conversation by id: %w", err)
	}

	// Get participants
	participants, err := r.getParticipants(ctx, id)
	if err != nil {
		return nil, err
	}
	conv.Participants = participants

	return &conv, nil
}

// FindByUserID finds all conversations for a user.
func (r *ConversationRepository) FindByUserID(ctx context.Context, userID string) ([]*dm.Conversation, error) {
	query := `
		SELECT c.id, c.created_at, c.updated_at,
		       m.id, m.sender_id, m.content, m.is_edited, m.created_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient
		FROM conversations c
		INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
		LEFT JOIN dm_messages m ON c.last_message_id = m.id
		LEFT JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
		LEFT JOIN users u ON cp2.user_id = u.id
		WHERE cp.user_id = $1
		ORDER BY c.updated_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query conversations: %w", err)
	}
	defer rows.Close()

	var conversations []*dm.Conversation
	for rows.Next() {
		var conv dm.Conversation
		var msgID, msgSenderID, msgContent *string
		var msgIsEdited *bool
		var msgCreatedAt *interface{}
		var otherUserID, otherHandle, otherDisplayName *string
		var otherGradient []string

		err := rows.Scan(
			&conv.ID, &conv.CreatedAt, &conv.UpdatedAt,
			&msgID, &msgSenderID, &msgContent, &msgIsEdited, &msgCreatedAt,
			&otherUserID, &otherHandle, &otherDisplayName, &otherGradient,
		)
		if err != nil {
			return nil, fmt.Errorf("scan conversation: %w", err)
		}

		// Set last message if exists
		if msgID != nil {
			conv.LastMessage = &dm.Message{
				ID:       *msgID,
				SenderID: *msgSenderID,
				Content:  *msgContent,
			}
			if msgIsEdited != nil {
				conv.LastMessage.IsEdited = *msgIsEdited
			}
		}

		// Set other user
		if otherUserID != nil {
			conv.OtherUser = &dm.ConversationUser{
				ID:          *otherUserID,
				Handle:      *otherHandle,
				DisplayName: *otherDisplayName,
			}
			if len(otherGradient) >= 2 {
				conv.OtherUser.AvatarGradient = [2]string{otherGradient[0], otherGradient[1]}
			}
		}

		conversations = append(conversations, &conv)
	}

	return conversations, nil
}

// FindByParticipants finds a conversation between two users.
func (r *ConversationRepository) FindByParticipants(ctx context.Context, userID1, userID2 string) (*dm.Conversation, error) {
	query := `
		SELECT c.id
		FROM conversations c
		INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
		INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
		WHERE (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
		LIMIT 1
	`

	var convID string
	err := r.pool.QueryRow(ctx, query, userID1, userID2).Scan(&convID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query conversation by participants: %w", err)
	}

	return r.FindByID(ctx, convID)
}

// Create creates a new conversation.
func (r *ConversationRepository) Create(ctx context.Context, conv *dm.Conversation) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Create conversation
	query := `INSERT INTO conversations (id, created_at, updated_at) VALUES ($1, $2, $3)`
	_, err = tx.Exec(ctx, query, conv.ID, conv.CreatedAt, conv.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert conversation: %w", err)
	}

	// Add participants
	for _, userID := range conv.Participants {
		partQuery := `INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at) VALUES ($1, $2, $3, $4)`
		partID := generatePartID()
		_, err = tx.Exec(ctx, partQuery, partID, conv.ID, userID, conv.CreatedAt)
		if err != nil {
			return fmt.Errorf("insert participant: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// UpdateLastMessage updates the last message of a conversation.
func (r *ConversationRepository) UpdateLastMessage(ctx context.Context, convID, messageID string) error {
	query := `UPDATE conversations SET last_message_id = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, convID, messageID)
	if err != nil {
		return fmt.Errorf("update last message: %w", err)
	}
	return nil
}

// IsParticipant checks if a user is a participant of a conversation.
func (r *ConversationRepository) IsParticipant(ctx context.Context, convID, userID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, convID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check participant: %w", err)
	}
	return exists, nil
}

func (r *ConversationRepository) getParticipants(ctx context.Context, convID string) ([]string, error) {
	query := `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`
	rows, err := r.pool.Query(ctx, query, convID)
	if err != nil {
		return nil, fmt.Errorf("query participants: %w", err)
	}
	defer rows.Close()

	var participants []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}
		participants = append(participants, userID)
	}
	return participants, nil
}

func generatePartID() string {
	return generateIDWithPrefix("part")
}

func generateIDWithPrefix(prefix string) string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	if len(prefix) > 4 {
		prefix = prefix[:4]
	}
	return prefix + "_" + clean[:21]
}
