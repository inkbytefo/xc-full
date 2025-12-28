package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateHandle(t *testing.T) {
	tests := []struct {
		name    string
		handle  string
		wantErr error
	}{
		// Valid handles
		{
			name:    "valid lowercase",
			handle:  "johndoe",
			wantErr: nil,
		},
		{
			name:    "valid with numbers",
			handle:  "john123",
			wantErr: nil,
		},
		{
			name:    "valid with underscore",
			handle:  "john_doe",
			wantErr: nil,
		},
		{
			name:    "valid with dot",
			handle:  "john.doe",
			wantErr: nil,
		},
		{
			name:    "valid with hyphen",
			handle:  "john-doe",
			wantErr: nil,
		},
		{
			name:    "valid minimum length",
			handle:  "abc",
			wantErr: nil,
		},
		{
			name:    "valid mixed special chars",
			handle:  "john_doe.123",
			wantErr: nil,
		},

		// Invalid handles - format
		{
			name:    "too short",
			handle:  "ab",
			wantErr: ErrInvalidHandleFormat,
		},
		{
			name:    "starts with special char",
			handle:  "_johndoe",
			wantErr: ErrInvalidHandleFormat,
		},
		{
			name:    "ends with special char",
			handle:  "johndoe_",
			wantErr: ErrInvalidHandleFormat,
		},
		{
			name:    "uppercase letters become valid after lowercase",
			handle:  "JohnDoe",
			wantErr: nil, // ValidateHandle lowercases first, so "johndoe" is valid
		},
		{
			name:    "contains space",
			handle:  "john doe",
			wantErr: ErrInvalidHandleFormat,
		},

		// Invalid handles - reserved words
		{
			name:    "reserved - admin",
			handle:  "admin",
			wantErr: ErrHandleReserved,
		},
		{
			name:    "reserved - support",
			handle:  "support",
			wantErr: ErrHandleReserved,
		},
		{
			name:    "reserved - api",
			handle:  "api",
			wantErr: ErrHandleReserved,
		},
		{
			name:    "reserved - pink",
			handle:  "pink",
			wantErr: ErrHandleReserved,
		},
		{
			name:    "reserved - everyone",
			handle:  "everyone",
			wantErr: ErrHandleReserved,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateHandle(tt.handle)
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateHandle_ConsecutiveSpecialChars(t *testing.T) {
	tests := []struct {
		name   string
		handle string
	}{
		{"double dot", "john..doe"},
		{"double underscore", "john__doe"},
		{"double hyphen", "john--doe"},
		{"mixed consecutive", "john._doe"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateHandle(tt.handle)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "consecutive")
		})
	}
}

func TestValidateHandle_CaseInsensitive(t *testing.T) {
	// Reserved words should be caught regardless of case
	// ValidateHandle lowercases the input first, so "ADMIN" -> "admin" is reserved
	err := ValidateHandle("ADMIN")
	assert.ErrorIs(t, err, ErrHandleReserved)

	err = ValidateHandle("Admin")
	assert.ErrorIs(t, err, ErrHandleReserved)
}
