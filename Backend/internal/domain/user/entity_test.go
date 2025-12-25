package user

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestSession_IsExpired(t *testing.T) {
	tests := []struct {
		name      string
		expiresAt time.Time
		want      bool
	}{
		{
			name:      "not expired - future",
			expiresAt: time.Now().Add(1 * time.Hour),
			want:      false,
		},
		{
			name:      "expired - past",
			expiresAt: time.Now().Add(-1 * time.Hour),
			want:      true,
		},
		{
			name:      "just expired",
			expiresAt: time.Now().Add(-1 * time.Second),
			want:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := &Session{
				ExpiresAt: tt.expiresAt,
			}
			assert.Equal(t, tt.want, session.IsExpired())
		})
	}
}

func TestUser_ToPublic(t *testing.T) {
	user := &User{
		ID:             "user_12345678",
		Handle:         "testuser",
		DisplayName:    "Test User",
		Email:          "test@example.com",
		PasswordHash:   "hashedpassword",
		AvatarGradient: [2]string{"#ff6b6b", "#4ecdc4"},
		Bio:            "This is a bio",
		IsVerified:     true,
		IsActive:       true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	public := user.ToPublic()

	assert.Equal(t, user.ID, public.ID)
	assert.Equal(t, user.Handle, public.Handle)
	assert.Equal(t, user.DisplayName, public.DisplayName)
	assert.Equal(t, user.AvatarGradient, public.AvatarGradient)
}
