package validation

import (
	"errors"
	"regexp"
	"strings"
)

var (
	// HandleRegex enforces:
	// - 3-30 characters
	// - lowercase letters, numbers, underscores, dots, hyphens
	// - must start and end with an alphanumeric character
	// - no consecutive special characters (optional, but good practice)
	HandleRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$`)

	// ConsecutiveSpecialCharsRegex checks for ".." or "__" or "--" or "._" etc.
	// This prevents confusing handles like "user..name"
	ConsecutiveSpecialCharsRegex = regexp.MustCompile(`[._-]{2,}`)

	// ErrInvalidHandleFormat is returned when regex fails
	ErrInvalidHandleFormat = errors.New("handle must be 3-30 characters, contain only lowercase letters, numbers, and ._-")

	// ErrHandleReserved is returned when using a reserved word
	ErrHandleReserved = errors.New("this handle is reserved")

	// ReservedWords is a list of handles that cannot be registered
	ReservedWords = map[string]bool{
		"admin":         true,
		"administrator": true,
		"support":       true,
		"help":          true,
		"mod":           true,
		"moderator":     true,
		"staff":         true,
		"team":          true,
		"api":           true,
		"bot":           true,
		"system":        true,
		"root":          true,
		"signin":        true,
		"signout":       true,
		"login":         true,
		"logout":        true,
		"register":      true,
		"auth":          true,
		"password":      true,
		"verify":        true,
		"dashboard":     true,
		"settings":      true,
		"profile":       true,
		"account":       true,
		"billing":       true,
		"security":      true,
		"privacy":       true,
		"terms":         true,
		"legal":         true,
		"about":         true,
		"contact":       true,
		"blog":          true,
		"status":        true,
		"jobs":          true,
		"careers":       true,
		"press":         true,
		"media":         true,
		"developer":     true,
		"developers":    true,
		"docs":          true,
		"documentation": true,
		"cdn":           true,
		"assets":        true,
		"static":        true,
		"image":         true,
		"images":        true,
		"video":         true,
		"videos":        true,
		"audio":         true,
		"download":      true,
		"uploads":       true,
		"public":        true,
		"private":       true,
		"me":            true, // Conflicting with /me endpoint logic often
		"you":           true,
		"all":           true,
		"null":          true,
		"undefined":     true,
		"void":          true,
		"xcord":         true,
		"pink":          true,
		"pinkgg":        true,
		"unknown":       true,
		"anonymous":     true,
		"everyone":      true, // Role conflict
		"here":          true, // Role conflict
	}
)

// ValidateHandle checks if a handle is valid and available for use (format-wise).
func ValidateHandle(handle string) error {
	handle = strings.ToLower(handle)

	// 1. Check format regex
	if !HandleRegex.MatchString(handle) {
		return ErrInvalidHandleFormat
	}

	// 2. Check strict non-consecutive special chars
	if ConsecutiveSpecialCharsRegex.MatchString(handle) {
		return errors.New("handle cannot contain consecutive special characters")
	}

	// 3. Check reserved words
	if ReservedWords[handle] {
		return ErrHandleReserved
	}

	return nil
}
