package post

import "context"

// Repository defines the interface for post data access.
type Repository interface {
	// FindByID finds a post by its ID.
	FindByID(ctx context.Context, id string) (*Post, error)

	// FindByAuthorID finds posts by author with pagination.
	FindByAuthorID(ctx context.Context, authorID string, cursor string, limit int) ([]*Post, string, error)

	// FindFeed finds posts for a user's feed with pagination.
	FindFeed(ctx context.Context, userID string, filter FeedFilter) ([]*Post, string, error)

	// Create creates a new post.
	Create(ctx context.Context, post *Post) error

	// Delete deletes a post by its ID.
	Delete(ctx context.Context, id string) error

	// IncrementCount increments a post counter.
	IncrementCount(ctx context.Context, id string, field string, delta int) error
}

// ReactionRepository defines the interface for reaction data access.
type ReactionRepository interface {
	// FindByPostAndUser finds a reaction by post and user ID.
	FindByPostAndUser(ctx context.Context, postID, userID string, reactionType ReactionType) (*Reaction, error)

	// FindByPostID finds all reactions of a type for a post with pagination.
	FindByPostID(ctx context.Context, postID string, reactionType ReactionType, cursor string, limit int) ([]*Reaction, string, error)

	// GetUserReactions gets a user's reactions for a set of posts.
	GetUserReactions(ctx context.Context, userID string, postIDs []string) (map[string][]ReactionType, error)

	// Create creates a new reaction.
	Create(ctx context.Context, reaction *Reaction) error

	// Delete deletes a reaction.
	Delete(ctx context.Context, postID, userID string, reactionType ReactionType) error

	// Exists checks if a reaction exists.
	Exists(ctx context.Context, postID, userID string, reactionType ReactionType) (bool, error)
}
