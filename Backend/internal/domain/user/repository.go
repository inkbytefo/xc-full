package user

import "context"

// Repository defines the interface for user data access.
type Repository interface {
	// FindByID finds a user by their ID.
	FindByID(ctx context.Context, id string) (*User, error)

	// FindByEmail finds a user by their email address.
	FindByEmail(ctx context.Context, email string) (*User, error)

	// FindByHandle finds a user by their handle.
	FindByHandle(ctx context.Context, handle string) (*User, error)

	// Create creates a new user.
	Create(ctx context.Context, user *User) error

	// Update updates an existing user.
	Update(ctx context.Context, user *User) error

	// Delete deletes a user by their ID.
	Delete(ctx context.Context, id string) error

	// UpdateLastSeen updates the user's last seen timestamp.
	UpdateLastSeen(ctx context.Context, id string) error
}

// SessionRepository defines the interface for session data access.
type SessionRepository interface {
	// Create creates a new session.
	Create(ctx context.Context, session *Session) error

	// FindByRefreshToken finds a session by its refresh token.
	FindByRefreshToken(ctx context.Context, refreshToken string) (*Session, error)

	// FindByUserID finds all sessions for a user.
	FindByUserID(ctx context.Context, userID string) ([]*Session, error)

	// Delete deletes a session by its ID.
	Delete(ctx context.Context, id string) error

	// DeleteByRefreshToken deletes a session by its refresh token.
	DeleteByRefreshToken(ctx context.Context, refreshToken string) error

	// DeleteByUserID deletes all sessions for a user.
	DeleteByUserID(ctx context.Context, userID string) error

	// DeleteExpired deletes all expired sessions.
	DeleteExpired(ctx context.Context) (int64, error)
}
