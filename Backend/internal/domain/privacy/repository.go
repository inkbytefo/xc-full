// Package privacy defines privacy settings domain repository interface.
package privacy

import "context"

// Repository defines privacy settings persistence operations
type Repository interface {
	// FindByUserID retrieves privacy settings for a user
	// Returns ErrNotFound if settings don't exist
	FindByUserID(ctx context.Context, userID string) (*Settings, error)

	// Upsert creates or updates privacy settings for a user
	// Uses INSERT ... ON CONFLICT DO UPDATE pattern
	Upsert(ctx context.Context, settings *Settings) error

	// Delete removes privacy settings for a user
	Delete(ctx context.Context, userID string) error
}
