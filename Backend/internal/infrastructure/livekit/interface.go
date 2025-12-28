// Package livekit provides LiveKit room and token management.
package livekit

import (
	"context"
	"time"

	"github.com/livekit/protocol/livekit"
)

// ServiceInterface defines the interface for LiveKit operations.
// This allows for easy mocking in tests.
type ServiceInterface interface {
	// CreateRoom creates a new LiveKit room.
	CreateRoom(ctx context.Context, name string, maxParticipants uint32) (*livekit.Room, error)

	// DeleteRoom deletes a LiveKit room.
	DeleteRoom(ctx context.Context, name string) error

	// ListParticipants lists all participants in a room.
	ListParticipants(ctx context.Context, roomName string) ([]*livekit.ParticipantInfo, error)

	// GetRoomInfo gets room information.
	GetRoomInfo(ctx context.Context, roomName string) (*livekit.Room, error)

	// RemoveParticipant removes a participant from a room.
	RemoveParticipant(ctx context.Context, roomName, identity string) error

	// GenerateToken generates a LiveKit access token for a user.
	GenerateToken(identity, roomName, metadata string, canPublish, canSubscribe bool, ttl time.Duration) (string, error)

	// MuteParticipant mutes/unmutes a participant.
	MuteParticipant(ctx context.Context, roomName, identity string, muted bool) error
}

// Ensure Service implements ServiceInterface
var _ ServiceInterface = (*Service)(nil)
