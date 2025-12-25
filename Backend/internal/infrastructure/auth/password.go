// Package auth provides authentication utilities.
package auth

import (
	"unicode"

	"golang.org/x/crypto/bcrypt"

	"xcord/internal/domain/user"
)

const (
	// bcryptCost is the cost factor for bcrypt hashing.
	// 13 is recommended for 2025 security standards.
	bcryptCost = 13

	// MinPasswordLength is the minimum password length.
	MinPasswordLength = 8

	// MaxPasswordLength is the maximum password length.
	MaxPasswordLength = 128
)

// PasswordHasher provides password hashing and verification.
type PasswordHasher struct{}

// NewPasswordHasher creates a new PasswordHasher.
func NewPasswordHasher() *PasswordHasher {
	return &PasswordHasher{}
}

// Hash hashes a password using bcrypt.
func (h *PasswordHasher) Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// Verify verifies a password against a hash.
func (h *PasswordHasher) Verify(password, hash string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		return user.ErrInvalidPassword
	}
	return nil
}

// Validate validates a password against security requirements.
func (h *PasswordHasher) Validate(password string) error {
	if len(password) < MinPasswordLength {
		return user.ErrPasswordTooShort
	}

	if len(password) > MaxPasswordLength {
		return user.ErrPasswordTooShort // Using same error for simplicity
	}

	var (
		hasUpper  bool
		hasLower  bool
		hasNumber bool
	)

	for _, c := range password {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsNumber(c):
			hasNumber = true
		}
	}

	if !hasUpper || !hasLower || !hasNumber {
		return user.ErrPasswordTooWeak
	}

	return nil
}
