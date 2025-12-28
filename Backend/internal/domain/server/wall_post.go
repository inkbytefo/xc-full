package server

import (
	"context"
	"time"
)

// WallPost represents a post on a server's wall.
type WallPost struct {
	ID        string
	ServerID  string
	AuthorID  string
	Content   string
	IsPinned  bool
	Hashtags  []string // Extracted from content
	CreatedAt time.Time
	UpdatedAt time.Time
}

// WallPostRepository defines the interface for server wall post data access.
type WallPostRepository interface {
	// Create creates a new wall post.
	Create(ctx context.Context, post *WallPost) error

	// FindByID finds a wall post by ID.
	FindByID(ctx context.Context, id string) (*WallPost, error)

	// FindByServer finds all wall posts for a server.
	FindByServer(ctx context.Context, serverID string, cursor string, limit int) ([]*WallPost, string, error)

	// Update updates a wall post.
	Update(ctx context.Context, post *WallPost) error

	// Delete deletes a wall post.
	Delete(ctx context.Context, id string) error

	// Pin pins a wall post.
	Pin(ctx context.Context, id string) error

	// Unpin unpins a wall post.
	Unpin(ctx context.Context, id string) error

	// CountByServer counts posts for a server.
	CountByServer(ctx context.Context, serverID string) (int64, error)
}
