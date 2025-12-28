package livekit

import (
	"context"
	"time"

	"github.com/livekit/protocol/livekit"
	"github.com/stretchr/testify/mock"
)

// MockService is a mock implementation of ServiceInterface for testing.
type MockService struct {
	mock.Mock
}

// CreateRoom mocks room creation.
func (m *MockService) CreateRoom(ctx context.Context, name string, maxParticipants uint32) (*livekit.Room, error) {
	args := m.Called(ctx, name, maxParticipants)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*livekit.Room), args.Error(1)
}

// DeleteRoom mocks room deletion.
func (m *MockService) DeleteRoom(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

// ListParticipants mocks listing participants.
func (m *MockService) ListParticipants(ctx context.Context, roomName string) ([]*livekit.ParticipantInfo, error) {
	args := m.Called(ctx, roomName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*livekit.ParticipantInfo), args.Error(1)
}

// GetRoomInfo mocks getting room info.
func (m *MockService) GetRoomInfo(ctx context.Context, roomName string) (*livekit.Room, error) {
	args := m.Called(ctx, roomName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*livekit.Room), args.Error(1)
}

// RemoveParticipant mocks removing a participant.
func (m *MockService) RemoveParticipant(ctx context.Context, roomName, identity string) error {
	args := m.Called(ctx, roomName, identity)
	return args.Error(0)
}

// GenerateToken mocks token generation.
func (m *MockService) GenerateToken(identity, roomName, metadata string, canPublish, canSubscribe bool, ttl time.Duration) (string, error) {
	args := m.Called(identity, roomName, metadata, canPublish, canSubscribe, ttl)
	return args.String(0), args.Error(1)
}

// MuteParticipant mocks muting a participant.
func (m *MockService) MuteParticipant(ctx context.Context, roomName, identity string, muted bool) error {
	args := m.Called(ctx, roomName, identity, muted)
	return args.Error(0)
}

// Ensure MockService implements ServiceInterface
var _ ServiceInterface = (*MockService)(nil)
