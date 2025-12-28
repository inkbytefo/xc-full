// Package live defines the Live Streaming domain entities.
package live

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrStreamNotFound   = errors.New("stream not found")
	ErrCategoryNotFound = errors.New("category not found")
	ErrStreamNotLive    = errors.New("stream is not live")
	ErrNoPermission     = errors.New("no permission")
	ErrAlreadyStreaming = errors.New("user is already streaming")
	ErrInvalidStreamKey = errors.New("invalid stream key")
)

// StreamStatus represents the status of a stream.
type StreamStatus string

const (
	StatusOffline StreamStatus = "offline"
	StatusLive    StreamStatus = "live"
	StatusEnding  StreamStatus = "ending"
)

// StreamType represents the type of stream.
type StreamType string

const (
	StreamTypeUser   StreamType = "user"   // Personal profile stream
	StreamTypeServer StreamType = "server" // Server-based professional stream
)

// Stream represents a live stream.
type Stream struct {
	ID           string
	UserID       string
	Title        string
	Description  string
	CategoryID   *string
	ThumbnailURL *string
	StreamKey    string
	Status       StreamStatus
	ViewerCount  int
	IsNSFW       bool
	StartedAt    *time.Time
	EndedAt      *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time

	// Stream type and server association
	Type     StreamType // user or server
	ServerID *string    // Only for server streams

	// OvenMediaEngine integration
	IngestURL   string // RTMP push URL (e.g., rtmp://host/app/stream_key)
	PlaybackURL string // HLS playback URL
	MaxQuality  string // 1080p, 720p, 480p

	// Joined fields
	Streamer *StreamerInfo
	Category *Category
}

// StreamerInfo represents the streamer info in a stream.
type StreamerInfo struct {
	ID             string
	Handle         string
	DisplayName    string
	AvatarGradient [2]string
	IsVerified     bool
	FollowerCount  int
}

// Category represents a stream category.
type Category struct {
	ID          string
	Name        string
	Slug        string
	Description string
	IconURL     *string
	StreamCount int
	CreatedAt   time.Time
}

// Viewer represents a stream viewer.
type Viewer struct {
	StreamID string
	UserID   string
	JoinedAt time.Time
}
