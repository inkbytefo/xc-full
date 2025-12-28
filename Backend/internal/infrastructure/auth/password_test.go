package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"pink/internal/domain/user"
)

func TestPasswordHasher_Hash(t *testing.T) {
	hasher := NewPasswordHasher()

	password := "TestPassword123"
	hash, err := hasher.Hash(password)

	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)
}

func TestPasswordHasher_Verify(t *testing.T) {
	hasher := NewPasswordHasher()

	password := "TestPassword123"
	hash, err := hasher.Hash(password)
	require.NoError(t, err)

	// Correct password
	err = hasher.Verify(password, hash)
	assert.NoError(t, err)

	// Wrong password
	err = hasher.Verify("WrongPassword123", hash)
	assert.ErrorIs(t, err, user.ErrInvalidPassword)
}

func TestPasswordHasher_Validate(t *testing.T) {
	hasher := NewPasswordHasher()

	tests := []struct {
		name     string
		password string
		wantErr  error
	}{
		{
			name:     "valid password",
			password: "ValidPass123",
			wantErr:  nil,
		},
		{
			name:     "too short",
			password: "Ab1",
			wantErr:  user.ErrPasswordTooShort,
		},
		{
			name:     "missing uppercase",
			password: "password123",
			wantErr:  user.ErrPasswordTooWeak,
		},
		{
			name:     "missing lowercase",
			password: "PASSWORD123",
			wantErr:  user.ErrPasswordTooWeak,
		},
		{
			name:     "missing number",
			password: "PasswordABC",
			wantErr:  user.ErrPasswordTooWeak,
		},
		{
			name:     "complex valid password",
			password: "MyS3cur3P@ssw0rd!",
			wantErr:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := hasher.Validate(tt.password)
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
