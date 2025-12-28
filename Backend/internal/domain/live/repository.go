package live

import "context"

// StreamRepository defines the interface for stream data access.
type StreamRepository interface {
	// FindByID finds a stream by its ID.
	FindByID(ctx context.Context, id string) (*Stream, error)

	// FindByUserID finds an active stream by user ID.
	FindByUserID(ctx context.Context, userID string) (*Stream, error)

	// FindByStreamKey finds a stream by its stream key.
	FindByStreamKey(ctx context.Context, streamKey string) (*Stream, error)

	// FindLive finds all live streams with pagination.
	FindLive(ctx context.Context, cursor string, limit int) ([]*Stream, string, error)

	// FindByCategoryID finds live streams by category.
	FindByCategoryID(ctx context.Context, categoryID string, cursor string, limit int) ([]*Stream, string, error)

	// FindByServerID finds streams by server ID.
	FindByServerID(ctx context.Context, serverID string, cursor string, limit int) ([]*Stream, string, error)

	// Create creates a new stream.
	Create(ctx context.Context, stream *Stream) error

	// Update updates a stream.
	Update(ctx context.Context, stream *Stream) error

	// UpdateStatus updates stream status.
	UpdateStatus(ctx context.Context, id string, status StreamStatus) error

	// UpdateViewerCount updates viewer count.
	UpdateViewerCount(ctx context.Context, id string, delta int) error

	// Delete deletes a stream.
	Delete(ctx context.Context, id string) error
}

// CategoryRepository defines the interface for category data access.
type CategoryRepository interface {
	// FindAll finds all categories.
	FindAll(ctx context.Context) ([]*Category, error)

	// FindByID finds a category by its ID.
	FindByID(ctx context.Context, id string) (*Category, error)

	// FindBySlug finds a category by its slug.
	FindBySlug(ctx context.Context, slug string) (*Category, error)

	// Create creates a new category.
	Create(ctx context.Context, category *Category) error

	// UpdateStreamCount updates stream count for a category.
	UpdateStreamCount(ctx context.Context, id string, delta int) error
}

// ViewerRepository defines the interface for viewer data access.
type ViewerRepository interface {
	// Add adds a viewer to a stream.
	Add(ctx context.Context, viewer *Viewer) error

	// Remove removes a viewer from a stream.
	Remove(ctx context.Context, streamID, userID string) error

	// IsViewing checks if a user is viewing a stream.
	IsViewing(ctx context.Context, streamID, userID string) (bool, error)

	// GetViewers gets all viewers of a stream.
	GetViewers(ctx context.Context, streamID string) ([]*Viewer, error)
}
