// Package id provides unified ID generation utilities.
package id

import (
	"github.com/google/uuid"
)

// Generate creates a prefixed unique ID.
// The prefix is truncated to 4 characters if longer.
// Format: "{prefix}_{21-char-uuid}"
func Generate(prefix string) string {
	id := uuid.New().String()
	// Remove dashes: 8-4-4-4-12 -> 32 chars
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	if len(prefix) > 4 {
		prefix = prefix[:4]
	}
	return prefix + "_" + clean[:21]
}

// GenerateUUID creates a clean UUID without dashes.
func GenerateUUID() string {
	id := uuid.New().String()
	return id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
}
