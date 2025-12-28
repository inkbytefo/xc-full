package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pink/internal/domain/live"
)

// CategoryRepository implements live.CategoryRepository using PostgreSQL.
type CategoryRepository struct {
	pool *pgxpool.Pool
}

// NewCategoryRepository creates a new CategoryRepository.
func NewCategoryRepository(pool *pgxpool.Pool) *CategoryRepository {
	return &CategoryRepository{pool: pool}
}

// FindAll finds all categories.
func (r *CategoryRepository) FindAll(ctx context.Context) ([]*live.Category, error) {
	query := `
		SELECT id, name, slug, description, icon_url, stream_count, created_at
		FROM stream_categories
		ORDER BY stream_count DESC, name ASC
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	var categories []*live.Category
	for rows.Next() {
		var cat live.Category
		err := rows.Scan(&cat.ID, &cat.Name, &cat.Slug, &cat.Description, &cat.IconURL, &cat.StreamCount, &cat.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, &cat)
	}

	return categories, nil
}

// FindByID finds a category by its ID.
func (r *CategoryRepository) FindByID(ctx context.Context, id string) (*live.Category, error) {
	query := `SELECT id, name, slug, description, icon_url, stream_count, created_at FROM stream_categories WHERE id = $1`

	var cat live.Category
	err := r.pool.QueryRow(ctx, query, id).Scan(&cat.ID, &cat.Name, &cat.Slug, &cat.Description, &cat.IconURL, &cat.StreamCount, &cat.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, live.ErrCategoryNotFound
		}
		return nil, fmt.Errorf("query category by id: %w", err)
	}

	return &cat, nil
}

// FindBySlug finds a category by its slug.
func (r *CategoryRepository) FindBySlug(ctx context.Context, slug string) (*live.Category, error) {
	query := `SELECT id, name, slug, description, icon_url, stream_count, created_at FROM stream_categories WHERE slug = $1`

	var cat live.Category
	err := r.pool.QueryRow(ctx, query, slug).Scan(&cat.ID, &cat.Name, &cat.Slug, &cat.Description, &cat.IconURL, &cat.StreamCount, &cat.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, live.ErrCategoryNotFound
		}
		return nil, fmt.Errorf("query category by slug: %w", err)
	}

	return &cat, nil
}

// Create creates a new category.
func (r *CategoryRepository) Create(ctx context.Context, cat *live.Category) error {
	query := `INSERT INTO stream_categories (id, name, slug, description, icon_url, created_at) VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.pool.Exec(ctx, query, cat.ID, cat.Name, cat.Slug, cat.Description, cat.IconURL, cat.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert category: %w", err)
	}

	return nil
}

// UpdateStreamCount updates stream count for a category.
func (r *CategoryRepository) UpdateStreamCount(ctx context.Context, id string, delta int) error {
	query := `UPDATE stream_categories SET stream_count = GREATEST(0, stream_count + $2) WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id, delta)
	if err != nil {
		return fmt.Errorf("update stream count: %w", err)
	}

	return nil
}
