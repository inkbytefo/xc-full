package live

import (
	"context"
	"time"
)

// Recording represents a VOD recording of a stream.
type Recording struct {
	ID           string    `json:"id"`
	StreamID     string    `json:"streamId"`
	UserID       string    `json:"userId"`
	FilePath     string    `json:"filePath"` // Internal path
	Duration     string    `json:"duration"` // e.g. "2h 30m"
	ThumbnailURL string    `json:"thumbnailUrl,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// RecordingRepository defines methods for recording persistence.
type RecordingRepository interface {
	Create(ctx context.Context, recording *Recording) error
	FindByStreamID(ctx context.Context, streamID string) ([]*Recording, error)
	FindByID(ctx context.Context, id string) (*Recording, error)
}
