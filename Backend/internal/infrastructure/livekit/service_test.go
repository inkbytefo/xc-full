package livekit

import (
	"context"
	"testing"
	"time"

	"github.com/livekit/protocol/livekit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// Service Configuration Tests
// =============================================================================

func TestNewService_MissingConfig(t *testing.T) {
	tests := []struct {
		name   string
		config Config
	}{
		{
			name:   "missing host",
			config: Config{Host: "", APIKey: "key", APISecret: "secret"},
		},
		{
			name:   "missing api key",
			config: Config{Host: "ws://localhost:7880", APIKey: "", APISecret: "secret"},
		},
		{
			name:   "missing api secret",
			config: Config{Host: "ws://localhost:7880", APIKey: "key", APISecret: ""},
		},
		{
			name:   "all missing",
			config: Config{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, err := NewService(tt.config)

			assert.Error(t, err)
			assert.Nil(t, svc)
			assert.Contains(t, err.Error(), "missing configuration")
		})
	}
}

func TestNewService_ValidConfig(t *testing.T) {
	config := Config{
		Host:      "ws://localhost:7880",
		APIKey:    "test-api-key",
		APISecret: "test-api-secret",
	}

	svc, err := NewService(config)

	require.NoError(t, err)
	assert.NotNil(t, svc)
	assert.Equal(t, config.Host, svc.config.Host)
	assert.Equal(t, config.APIKey, svc.config.APIKey)
}

// =============================================================================
// Token Generation Tests
// =============================================================================

func TestService_GenerateToken(t *testing.T) {
	config := Config{
		Host:      "ws://localhost:7880",
		APIKey:    "test-api-key",
		APISecret: "test-api-secret-with-at-least-32-chars",
	}

	svc, err := NewService(config)
	require.NoError(t, err)

	tests := []struct {
		name         string
		identity     string
		roomName     string
		metadata     string
		canPublish   bool
		canSubscribe bool
		ttl          time.Duration
	}{
		{
			name:         "full permissions",
			identity:     "user_123",
			roomName:     "room_test",
			metadata:     `{"displayName":"Test User"}`,
			canPublish:   true,
			canSubscribe: true,
			ttl:          time.Hour,
		},
		{
			name:         "subscribe only",
			identity:     "viewer_456",
			roomName:     "room_stream",
			metadata:     "{}",
			canPublish:   false,
			canSubscribe: true,
			ttl:          30 * time.Minute,
		},
		{
			name:         "publish only",
			identity:     "broadcaster",
			roomName:     "room_broadcast",
			metadata:     "",
			canPublish:   true,
			canSubscribe: false,
			ttl:          2 * time.Hour,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := svc.GenerateToken(
				tt.identity,
				tt.roomName,
				tt.metadata,
				tt.canPublish,
				tt.canSubscribe,
				tt.ttl,
			)

			require.NoError(t, err)
			assert.NotEmpty(t, token)
			// JWT format: header.payload.signature
			assert.Contains(t, token, ".")
		})
	}
}

// =============================================================================
// Mock Service Tests
// =============================================================================

func TestMockService_CreateRoom(t *testing.T) {
	mockSvc := new(MockService)
	ctx := context.Background()

	expectedRoom := &livekit.Room{
		Name:            "test-room",
		Sid:             "room_sid_12345",
		NumParticipants: 0,
		MaxParticipants: 10,
	}

	mockSvc.On("CreateRoom", ctx, "test-room", uint32(10)).Return(expectedRoom, nil)

	room, err := mockSvc.CreateRoom(ctx, "test-room", 10)

	require.NoError(t, err)
	assert.Equal(t, expectedRoom.Name, room.Name)
	assert.Equal(t, expectedRoom.MaxParticipants, room.MaxParticipants)
	mockSvc.AssertExpectations(t)
}

func TestMockService_ListParticipants(t *testing.T) {
	mockSvc := new(MockService)
	ctx := context.Background()

	participants := []*livekit.ParticipantInfo{
		{
			Identity: "user_1",
			Name:     "User One",
			State:    livekit.ParticipantInfo_ACTIVE,
		},
		{
			Identity: "user_2",
			Name:     "User Two",
			State:    livekit.ParticipantInfo_ACTIVE,
		},
	}

	mockSvc.On("ListParticipants", ctx, "test-room").Return(participants, nil)

	result, err := mockSvc.ListParticipants(ctx, "test-room")

	require.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "user_1", result[0].Identity)
	mockSvc.AssertExpectations(t)
}

func TestMockService_DeleteRoom(t *testing.T) {
	mockSvc := new(MockService)
	ctx := context.Background()

	mockSvc.On("DeleteRoom", ctx, "old-room").Return(nil)

	err := mockSvc.DeleteRoom(ctx, "old-room")

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestMockService_RemoveParticipant(t *testing.T) {
	mockSvc := new(MockService)
	ctx := context.Background()

	mockSvc.On("RemoveParticipant", ctx, "test-room", "user_123").Return(nil)

	err := mockSvc.RemoveParticipant(ctx, "test-room", "user_123")

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestMockService_MuteParticipant(t *testing.T) {
	mockSvc := new(MockService)
	ctx := context.Background()

	mockSvc.On("MuteParticipant", ctx, "test-room", "user_123", true).Return(nil)

	err := mockSvc.MuteParticipant(ctx, "test-room", "user_123", true)

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestMockService_GenerateToken(t *testing.T) {
	mockSvc := new(MockService)

	mockSvc.On("GenerateToken",
		"user_123",
		"test-room",
		"{}",
		true,
		true,
		time.Hour,
	).Return("mock-jwt-token", nil)

	token, err := mockSvc.GenerateToken("user_123", "test-room", "{}", true, true, time.Hour)

	require.NoError(t, err)
	assert.Equal(t, "mock-jwt-token", token)
	mockSvc.AssertExpectations(t)
}

func TestMockService_GetRoomInfo(t *testing.T) {
	mockSvc := new(MockService)
	ctx := context.Background()

	expectedRoom := &livekit.Room{
		Name:            "active-room",
		Sid:             "room_sid_active",
		NumParticipants: 5,
	}

	mockSvc.On("GetRoomInfo", ctx, "active-room").Return(expectedRoom, nil)

	room, err := mockSvc.GetRoomInfo(ctx, "active-room")

	require.NoError(t, err)
	assert.Equal(t, uint32(5), room.NumParticipants)
	mockSvc.AssertExpectations(t)
}
