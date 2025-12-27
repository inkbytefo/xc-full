// Package user defines the User domain entity and related types.
package user

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrNotFound            = errors.New("user not found")
	ErrEmailAlreadyExists  = errors.New("email already exists")
	ErrHandleAlreadyExists = errors.New("handle already exists")
	ErrInvalidEmail        = errors.New("invalid email format")
	ErrInvalidHandle       = errors.New("invalid handle format")
	ErrInvalidPassword     = errors.New("invalid password")
	ErrPasswordTooShort    = errors.New("password must be at least 8 characters")
	ErrPasswordTooWeak     = errors.New("password must contain uppercase, lowercase, and number")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrSessionExpired      = errors.New("session expired")
	ErrSessionNotFound     = errors.New("session not found")
)

// User represents a user entity in the domain.
type User struct {
	ID             string
	Handle         string
	DisplayName    string
	Email          string
	PasswordHash   string
	AvatarGradient [2]string
	AvatarURL      string // Custom avatar image URL
	BannerURL      string // Profile banner image URL
	Bio            string
	IsVerified     bool
	IsActive       bool
	Metadata       map[string]interface{} // Flexible metadata for settings
	// Denormalized counters (Instagram-style)
	FollowersCount int64
	FollowingCount int64
	PostsCount     int64
	//
	LastSeenAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Session represents a user session for refresh tokens.
type Session struct {
	ID           string
	UserID       string
	RefreshToken string
	DeviceInfo   map[string]interface{}
	IPAddress    string
	ExpiresAt    time.Time
	CreatedAt    time.Time
}

// IsExpired checks if the session has expired.
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// PublicUser represents user data safe to expose publicly.
type PublicUser struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
	AvatarURL      string    `json:"avatarUrl,omitempty"`
	BannerURL      string    `json:"bannerUrl,omitempty"`
}

// ToPublic converts a User to PublicUser.
func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:             u.ID,
		Handle:         u.Handle,
		DisplayName:    u.DisplayName,
		AvatarGradient: u.AvatarGradient,
		AvatarURL:      u.AvatarURL,
		BannerURL:      u.BannerURL,
	}
}
