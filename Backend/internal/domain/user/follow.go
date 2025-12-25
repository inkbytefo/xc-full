package user

import (
	"context"
	"time"
)

// FollowStatus represents the status of a follow relationship.
type FollowStatus string

const (
	FollowStatusActive  FollowStatus = "active"  // User is actively following
	FollowStatusPending FollowStatus = "pending" // Follow request pending approval
	FollowStatusBlocked FollowStatus = "blocked" // User has been blocked
)

// IsValid checks if the follow status is valid.
func (s FollowStatus) IsValid() bool {
	switch s {
	case FollowStatusActive, FollowStatusPending, FollowStatusBlocked:
		return true
	}
	return false
}

// Follow represents a follow relationship between two users.
type Follow struct {
	ID         string
	FollowerID string       // The user who is following
	FollowedID string       // The user being followed
	Status     FollowStatus // Relationship status
	CreatedAt  time.Time
	UpdatedAt  time.Time
	// Populated by joins
	Follower *User
	Followed *User
}

// IsActive returns true if the follow is active.
func (f *Follow) IsActive() bool {
	return f.Status == FollowStatusActive
}

// IsPending returns true if the follow is pending approval.
func (f *Follow) IsPending() bool {
	return f.Status == FollowStatusPending
}

// FollowRepository defines the interface for follow data access.
type FollowRepository interface {
	// Create creates a new follow relationship with the given status.
	Create(ctx context.Context, follow *Follow) error

	// Delete deletes a follow relationship.
	Delete(ctx context.Context, followerID, followedID string) error

	// UpdateStatus updates the status of a follow relationship.
	UpdateStatus(ctx context.Context, followerID, followedID string, status FollowStatus) error

	// Exists checks if a follow relationship exists (any status).
	Exists(ctx context.Context, followerID, followedID string) (bool, error)

	// ExistsWithStatus checks if a follow relationship exists with specific status.
	ExistsWithStatus(ctx context.Context, followerID, followedID string, status FollowStatus) (bool, error)

	// FindByUsers finds a follow relationship between two users.
	FindByUsers(ctx context.Context, followerID, followedID string) (*Follow, error)

	// FindFollowers finds all active followers of a user.
	FindFollowers(ctx context.Context, userID string, cursor string, limit int) ([]*Follow, string, error)

	// FindFollowing finds all users a user is actively following.
	FindFollowing(ctx context.Context, userID string, cursor string, limit int) ([]*Follow, string, error)

	// FindPendingRequests finds all pending follow requests for a user.
	FindPendingRequests(ctx context.Context, userID string, cursor string, limit int) ([]*Follow, string, error)

	// CountFollowers counts the number of active followers a user has.
	CountFollowers(ctx context.Context, userID string) (int64, error)

	// CountFollowing counts the number of users a user is actively following.
	CountFollowing(ctx context.Context, userID string) (int64, error)

	// CountPendingRequests counts pending follow requests for a user.
	CountPendingRequests(ctx context.Context, userID string) (int64, error)
}

// FollowWithUsers represents a follow with populated user data.
type FollowWithUsers struct {
	*Follow
	FollowerUser *User
	FollowedUser *User
}
