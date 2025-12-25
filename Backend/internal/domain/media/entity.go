// Package media defines the Media domain entities.
package media

import (
	"context"
	"errors"
	"time"
)

// Domain errors
var (
	ErrNotFound       = errors.New("media not found")
	ErrNoPermission   = errors.New("no permission to access media")
	ErrInvalidFile    = errors.New("invalid file")
	ErrFileTooLarge   = errors.New("file too large")
	ErrInvalidType    = errors.New("invalid file type")
)

// MediaType represents the type of media.
type MediaType string

const (
	TypeImage    MediaType = "image"
	TypeVideo    MediaType = "video"
	TypeAudio    MediaType = "audio"
	TypeDocument MediaType = "document"
)

// MaxFileSize is the maximum allowed file size (25MB)
const MaxFileSize = 25 * 1024 * 1024

// AllowedMimeTypes defines which MIME types are allowed
var AllowedMimeTypes = map[string]MediaType{
	"image/jpeg":      TypeImage,
	"image/png":       TypeImage,
	"image/gif":       TypeImage,
	"image/webp":      TypeImage,
	"video/mp4":       TypeVideo,
	"video/webm":      TypeVideo,
	"audio/mpeg":      TypeAudio,
	"audio/wav":       TypeAudio,
	"audio/ogg":       TypeAudio,
	"application/pdf": TypeDocument,
	"text/plain":      TypeDocument,
}

// Media represents an uploaded media file.
type Media struct {
	ID           string
	UserID       string
	Filename     string
	OriginalName string
	MimeType     string
	Type         MediaType
	Size         int64
	URL          string
	CreatedAt    time.Time
}

// Repository defines the media repository interface.
type Repository interface {
	Create(ctx context.Context, media *Media) error
	FindByID(ctx context.Context, id string) (*Media, error)
	FindByUserID(ctx context.Context, userID string, limit, offset int) ([]*Media, error)
	Delete(ctx context.Context, id string) error
}

// ValidateMimeType checks if the MIME type is allowed.
func ValidateMimeType(mimeType string) (MediaType, error) {
	mediaType, ok := AllowedMimeTypes[mimeType]
	if !ok {
		return "", ErrInvalidType
	}
	return mediaType, nil
}

// ValidateFileSize checks if the file size is within limits.
func ValidateFileSize(size int64) error {
	if size > MaxFileSize {
		return ErrFileTooLarge
	}
	return nil
}
