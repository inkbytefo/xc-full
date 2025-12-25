package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"xcord/internal/adapters/http/dto"
)

// SearchRepository implements search operations using PostgreSQL.
type SearchRepository struct {
	pool *pgxpool.Pool
}

// NewSearchRepository creates a new SearchRepository.
func NewSearchRepository(pool *pgxpool.Pool) *SearchRepository {
	return &SearchRepository{pool: pool}
}

// SearchUsers searches for users by handle or display name.
func (r *SearchRepository) SearchUsers(query string, limit int) ([]dto.SearchUserResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	searchQuery := "%" + query + "%"
	sqlQuery := `
		SELECT id, handle, display_name, avatar_gradient, is_verified
		FROM users
		WHERE handle ILIKE $1 OR display_name ILIKE $1
		ORDER BY 
			CASE WHEN handle ILIKE $2 THEN 0 ELSE 1 END,
			char_length(handle)
		LIMIT $3
	`

	rows, err := r.pool.Query(context.Background(), sqlQuery, searchQuery, query+"%", limit)
	if err != nil {
		return nil, fmt.Errorf("search users: %w", err)
	}
	defer rows.Close()

	var users []dto.SearchUserResult
	for rows.Next() {
		var user dto.SearchUserResult
		var gradient []string

		err := rows.Scan(&user.ID, &user.Handle, &user.DisplayName, &gradient, &user.IsVerified)
		if err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}

		if len(gradient) >= 2 {
			user.AvatarGradient = [2]string{gradient[0], gradient[1]}
		}

		users = append(users, user)
	}

	if users == nil {
		users = []dto.SearchUserResult{}
	}

	return users, nil
}

// SearchServers searches for public servers by name.
func (r *SearchRepository) SearchServers(query string, limit int) ([]dto.SearchServerResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var rows pgx.Rows
	var err error

	if query == "" {
		sqlQuery := `
			SELECT id, name, description, icon_gradient, member_count
			FROM servers
			WHERE is_public = TRUE
			ORDER BY member_count DESC
			LIMIT $1
		`
		rows, err = r.pool.Query(context.Background(), sqlQuery, limit)
	} else {
		searchQuery := "%" + query + "%"
		sqlQuery := `
			SELECT id, name, description, icon_gradient, member_count
			FROM servers
			WHERE is_public = TRUE AND (name ILIKE $1 OR description ILIKE $1)
			ORDER BY member_count DESC
			LIMIT $2
		`
		rows, err = r.pool.Query(context.Background(), sqlQuery, searchQuery, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("search servers: %w", err)
	}
	defer rows.Close()

	var servers []dto.SearchServerResult
	for rows.Next() {
		var server dto.SearchServerResult
		var gradient []string
		var desc sql.NullString

		err := rows.Scan(&server.ID, &server.Name, &desc, &gradient, &server.MemberCount)
		if err != nil {
			return nil, fmt.Errorf("scan server: %w", err)
		}

		server.Description = desc.String
		if len(gradient) >= 2 {
			server.IconGradient = [2]string{gradient[0], gradient[1]}
		}

		servers = append(servers, server)
	}

	if servers == nil {
		servers = []dto.SearchServerResult{}
	}

	return servers, nil
}

// SearchPosts searches for posts by content using full-text search.
func (r *SearchRepository) SearchPosts(query string, limit int) ([]dto.SearchPostResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	// Using ILIKE for simple search, could use full-text search for better results
	searchQuery := "%" + query + "%"
	sqlQuery := `
		SELECT p.id, p.author_id, p.content, p.like_count, p.created_at,
		       u.handle, u.display_name, u.avatar_gradient
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.visibility = 'public' AND p.content ILIKE $1
		ORDER BY p.created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(context.Background(), sqlQuery, searchQuery, limit)
	if err != nil {
		return nil, fmt.Errorf("search posts: %w", err)
	}
	defer rows.Close()

	var posts []dto.SearchPostResult
	for rows.Next() {
		var post dto.SearchPostResult
		var gradient []string

		err := rows.Scan(
			&post.ID, &post.AuthorID, &post.Content, &post.LikeCount, &post.CreatedAt,
			&post.AuthorHandle, &post.AuthorDisplayName, &gradient,
		)
		if err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}

		if len(gradient) >= 2 {
			post.AuthorAvatarGradient = [2]string{gradient[0], gradient[1]}
		}

		posts = append(posts, post)
	}

	if posts == nil {
		posts = []dto.SearchPostResult{}
	}

	return posts, nil
}
