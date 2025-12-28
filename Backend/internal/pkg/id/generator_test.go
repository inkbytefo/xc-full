package id

import (
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerate(t *testing.T) {
	tests := []struct {
		name           string
		prefix         string
		expectedPrefix string
	}{
		{
			name:           "normal prefix",
			prefix:         "user",
			expectedPrefix: "user_",
		},
		{
			name:           "long prefix truncated",
			prefix:         "verylongprefix",
			expectedPrefix: "very_",
		},
		{
			name:           "short prefix",
			prefix:         "u",
			expectedPrefix: "u_",
		},
		{
			name:           "empty prefix",
			prefix:         "",
			expectedPrefix: "_",
		},
		{
			name:           "exactly 4 chars",
			prefix:         "serv",
			expectedPrefix: "serv_",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Generate(tt.prefix)

			// Check prefix
			assert.True(t, strings.HasPrefix(result, tt.expectedPrefix),
				"expected prefix %s, got %s", tt.expectedPrefix, result)

			// Check total length: prefix + "_" + 21 chars
			expectedLen := len(tt.expectedPrefix) + 21
			assert.Equal(t, expectedLen, len(result),
				"expected length %d, got %d", expectedLen, len(result))
		})
	}
}

func TestGenerate_Uniqueness(t *testing.T) {
	ids := make(map[string]bool)
	const count = 1000

	for i := 0; i < count; i++ {
		id := Generate("test")
		if ids[id] {
			t.Fatalf("duplicate ID generated: %s", id)
		}
		ids[id] = true
	}

	assert.Len(t, ids, count)
}

func TestGenerate_Format(t *testing.T) {
	id := Generate("user")

	// Should match pattern: prefix_[a-f0-9]{21}
	pattern := regexp.MustCompile(`^[a-z]+_[a-f0-9]{21}$`)
	assert.True(t, pattern.MatchString(id),
		"ID %s does not match expected pattern", id)
}

func TestGenerateUUID(t *testing.T) {
	uuid := GenerateUUID()

	// Should be 32 hex chars (UUID without dashes)
	assert.Len(t, uuid, 32)

	// Should only contain hex characters
	pattern := regexp.MustCompile(`^[a-f0-9]{32}$`)
	assert.True(t, pattern.MatchString(uuid),
		"UUID %s does not match expected pattern", uuid)
}

func TestGenerateUUID_Uniqueness(t *testing.T) {
	uuids := make(map[string]bool)
	const count = 1000

	for i := 0; i < count; i++ {
		uuid := GenerateUUID()
		if uuids[uuid] {
			t.Fatalf("duplicate UUID generated: %s", uuid)
		}
		uuids[uuid] = true
	}

	assert.Len(t, uuids, count)
}
