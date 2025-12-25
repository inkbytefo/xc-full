package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/domain/post"
)

// PostRepository implements post.Repository using PostgreSQL.
type PostRepository struct {
	pool *pgxpool.Pool
}

// NewPostRepository creates a new PostRepository.
func NewPostRepository(pool *pgxpool.Pool) *PostRepository {
	return &PostRepository{pool: pool}
}

// FindByID finds a post by its ID.
func (r *PostRepository) FindByID(ctx context.Context, id string) (*post.Post, error) {
	query := `
		SELECT p.id, p.author_id, p.content, p.visibility, p.server_id,
		       p.reply_to_id, p.repost_of_id, p.media_urls,
		       p.like_count, p.repost_count, p.reply_count,
		       p.created_at, p.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.id = $1
	`

	var p post.Post
	var author post.PostAuthor
	var serverID, replyToID, repostOfID *string
	var gradient []string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.AuthorID, &p.Content, &p.Visibility, &serverID,
		&replyToID, &repostOfID, &p.MediaURLs,
		&p.LikeCount, &p.RepostCount, &p.ReplyCount,
		&p.CreatedAt, &p.UpdatedAt,
		&author.ID, &author.Handle, &author.DisplayName, &gradient, &author.IsVerified,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, post.ErrNotFound
		}
		return nil, fmt.Errorf("query post by id: %w", err)
	}

	if len(gradient) >= 2 {
		author.AvatarGradient = [2]string{gradient[0], gradient[1]}
	}
	p.Author = &author
	p.ServerID = serverID
	p.ReplyToID = replyToID
	p.RepostOfID = repostOfID

	return &p, nil
}

// FindByAuthorID finds posts by author with pagination.
func (r *PostRepository) FindByAuthorID(ctx context.Context, authorID string, cursor string, limit int) ([]*post.Post, string, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var args []interface{}
	args = append(args, authorID, limit+1)

	query := `
		SELECT p.id, p.author_id, p.content, p.visibility, p.server_id,
		       p.reply_to_id, p.repost_of_id, p.media_urls,
		       p.like_count, p.repost_count, p.reply_count,
		       p.created_at, p.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.author_id = $1
	`

	if cursor != "" {
		query += ` AND p.created_at < $3`
		args = append(args, cursor)
	}

	query += ` ORDER BY p.created_at DESC LIMIT $2`

	return r.queryPosts(ctx, query, args, limit)
}

// FindFeed finds posts for a user's feed with pagination.
func (r *PostRepository) FindFeed(ctx context.Context, userID string, filter post.FeedFilter) ([]*post.Post, string, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var args []interface{}
	var conditions []string
	argIdx := 1

	// Base query - public posts only for now
	conditions = append(conditions, fmt.Sprintf("p.visibility = $%d", argIdx))
	args = append(args, "public")
	argIdx++

	// Cursor pagination
	if filter.Cursor != "" {
		conditions = append(conditions, fmt.Sprintf("p.created_at < $%d", argIdx))
		args = append(args, filter.Cursor)
		argIdx++
	}

	// Author filter
	if filter.AuthorID != "" {
		conditions = append(conditions, fmt.Sprintf("p.author_id = $%d", argIdx))
		args = append(args, filter.AuthorID)
		argIdx++
	}

	// Server filter
	if filter.ServerID != "" {
		conditions = append(conditions, fmt.Sprintf("p.server_id = $%d", argIdx))
		args = append(args, filter.ServerID)
		argIdx++
	}

	args = append(args, limit+1)

	query := fmt.Sprintf(`
		SELECT p.id, p.author_id, p.content, p.visibility, p.server_id,
		       p.reply_to_id, p.repost_of_id, p.media_urls,
		       p.like_count, p.repost_count, p.reply_count,
		       p.created_at, p.updated_at,
		       u.id, u.handle, u.display_name, u.avatar_gradient, u.is_verified
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE %s
		ORDER BY p.created_at DESC
		LIMIT $%d
	`, strings.Join(conditions, " AND "), argIdx)

	return r.queryPosts(ctx, query, args, limit)
}

func (r *PostRepository) queryPosts(ctx context.Context, query string, args []interface{}, limit int) ([]*post.Post, string, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("query posts: %w", err)
	}
	defer rows.Close()

	var posts []*post.Post
	for rows.Next() {
		var p post.Post
		var author post.PostAuthor
		var serverID, replyToID, repostOfID *string
		var gradient []string

		err := rows.Scan(
			&p.ID, &p.AuthorID, &p.Content, &p.Visibility, &serverID,
			&replyToID, &repostOfID, &p.MediaURLs,
			&p.LikeCount, &p.RepostCount, &p.ReplyCount,
			&p.CreatedAt, &p.UpdatedAt,
			&author.ID, &author.Handle, &author.DisplayName, &gradient, &author.IsVerified,
		)
		if err != nil {
			return nil, "", fmt.Errorf("scan post: %w", err)
		}

		if len(gradient) >= 2 {
			author.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}
		p.Author = &author
		p.ServerID = serverID
		p.ReplyToID = replyToID
		p.RepostOfID = repostOfID

		posts = append(posts, &p)
	}

	// Determine next cursor
	var nextCursor string
	if len(posts) > limit {
		nextCursor = posts[limit-1].CreatedAt.Format("2006-01-02T15:04:05.000000Z")
		posts = posts[:limit]
	}

	return posts, nextCursor, nil
}

// Create creates a new post.
func (r *PostRepository) Create(ctx context.Context, p *post.Post) error {
	query := `
		INSERT INTO posts (
			id, author_id, content, visibility, server_id,
			reply_to_id, repost_of_id, media_urls,
			like_count, repost_count, reply_count,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := r.pool.Exec(ctx, query,
		p.ID, p.AuthorID, p.Content, p.Visibility, p.ServerID,
		p.ReplyToID, p.RepostOfID, p.MediaURLs,
		p.LikeCount, p.RepostCount, p.ReplyCount,
		p.CreatedAt, p.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("insert post: %w", err)
	}

	return nil
}

// Delete deletes a post by its ID.
func (r *PostRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM posts WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}

	if result.RowsAffected() == 0 {
		return post.ErrNotFound
	}

	return nil
}

// IncrementCount increments a post counter.
func (r *PostRepository) IncrementCount(ctx context.Context, id string, field string, delta int) error {
	// Validate field name to prevent SQL injection
	validFields := map[string]bool{
		"like_count":   true,
		"repost_count": true,
		"reply_count":  true,
	}
	if !validFields[field] {
		return fmt.Errorf("invalid field: %s", field)
	}

	query := fmt.Sprintf(`UPDATE posts SET %s = %s + $2 WHERE id = $1`, field, field)

	_, err := r.pool.Exec(ctx, query, id, delta)
	if err != nil {
		return fmt.Errorf("increment %s: %w", field, err)
	}

	return nil
}
