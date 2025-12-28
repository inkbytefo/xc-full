package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/post"
)

// ReactionRepository implements post.ReactionRepository using PostgreSQL.
type ReactionRepository struct {
	pool *pgxpool.Pool
}

// NewReactionRepository creates a new ReactionRepository.
func NewReactionRepository(pool *pgxpool.Pool) *ReactionRepository {
	return &ReactionRepository{pool: pool}
}

// FindByPostAndUser finds a reaction by post and user ID.
func (r *ReactionRepository) FindByPostAndUser(ctx context.Context, postID, userID string, reactionType post.ReactionType) (*post.Reaction, error) {
	query := `
		SELECT id, post_id, user_id, type, created_at
		FROM reactions
		WHERE post_id = $1 AND user_id = $2 AND type = $3
	`

	var reaction post.Reaction
	err := r.pool.QueryRow(ctx, query, postID, userID, reactionType).Scan(
		&reaction.ID, &reaction.PostID, &reaction.UserID, &reaction.Type, &reaction.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query reaction: %w", err)
	}

	return &reaction, nil
}

// FindByPostID finds all reactions of a type for a post with pagination.
func (r *ReactionRepository) FindByPostID(ctx context.Context, postID string, reactionType post.ReactionType, cursor string, limit int) ([]*post.Reaction, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var args []interface{}
	args = append(args, postID, reactionType, limit+1)

	query := `
		SELECT id, post_id, user_id, type, created_at
		FROM reactions
		WHERE post_id = $1 AND type = $2
	`

	if cursor != "" {
		query += ` AND created_at < $4`
		args = append(args, cursor)
	}

	query += ` ORDER BY created_at DESC LIMIT $3`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("query reactions: %w", err)
	}
	defer rows.Close()

	var reactions []*post.Reaction
	for rows.Next() {
		var reaction post.Reaction
		err := rows.Scan(
			&reaction.ID, &reaction.PostID, &reaction.UserID, &reaction.Type, &reaction.CreatedAt,
		)
		if err != nil {
			return nil, "", fmt.Errorf("scan reaction: %w", err)
		}
		reactions = append(reactions, &reaction)
	}

	var nextCursor string
	if len(reactions) > limit {
		nextCursor = reactions[limit-1].CreatedAt.Format("2006-01-02T15:04:05.000000Z")
		reactions = reactions[:limit]
	}

	return reactions, nextCursor, nil
}

// GetUserReactions gets a user's reactions for a set of posts.
func (r *ReactionRepository) GetUserReactions(ctx context.Context, userID string, postIDs []string) (map[string][]post.ReactionType, error) {
	if len(postIDs) == 0 {
		return make(map[string][]post.ReactionType), nil
	}

	query := `
		SELECT post_id, type
		FROM reactions
		WHERE user_id = $1 AND post_id = ANY($2)
	`

	rows, err := r.pool.Query(ctx, query, userID, postIDs)
	if err != nil {
		return nil, fmt.Errorf("query user reactions: %w", err)
	}
	defer rows.Close()

	result := make(map[string][]post.ReactionType)
	for rows.Next() {
		var postID string
		var reactionType post.ReactionType
		if err := rows.Scan(&postID, &reactionType); err != nil {
			return nil, fmt.Errorf("scan user reaction: %w", err)
		}
		result[postID] = append(result[postID], reactionType)
	}

	return result, nil
}

// Create creates a new reaction.
func (r *ReactionRepository) Create(ctx context.Context, reaction *post.Reaction) error {
	query := `
		INSERT INTO reactions (id, post_id, user_id, type, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.pool.Exec(ctx, query,
		reaction.ID, reaction.PostID, reaction.UserID, reaction.Type, reaction.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert reaction: %w", err)
	}

	return nil
}

// Delete deletes a reaction.
func (r *ReactionRepository) Delete(ctx context.Context, postID, userID string, reactionType post.ReactionType) error {
	query := `DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = $3`

	_, err := r.pool.Exec(ctx, query, postID, userID, reactionType)
	if err != nil {
		return fmt.Errorf("delete reaction: %w", err)
	}

	return nil
}

// Exists checks if a reaction exists.
func (r *ReactionRepository) Exists(ctx context.Context, postID, userID string, reactionType post.ReactionType) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = $3)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, postID, userID, reactionType).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check reaction exists: %w", err)
	}

	return exists, nil
}
