package livekit

import (
	"context"
	"fmt"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go"
)

// Config holds LiveKit configuration.
type Config struct {
	Host      string // LiveKit server host (e.g., ws://localhost:7880)
	APIKey    string // LiveKit API key
	APISecret string // LiveKit API secret
}

// Service provides LiveKit room and token management.
type Service struct {
	config     Config
	roomClient *lksdk.RoomServiceClient
}

// NewService creates a new LiveKit service.
func NewService(cfg Config) (*Service, error) {
	if cfg.Host == "" || cfg.APIKey == "" || cfg.APISecret == "" {
		return nil, fmt.Errorf("livekit: missing configuration")
	}

	roomClient := lksdk.NewRoomServiceClient(cfg.Host, cfg.APIKey, cfg.APISecret)

	return &Service{
		config:     cfg,
		roomClient: roomClient,
	}, nil
}

// CreateRoom creates a new LiveKit room.
func (s *Service) CreateRoom(ctx context.Context, name string, maxParticipants uint32) (*livekit.Room, error) {
	req := &livekit.CreateRoomRequest{
		Name:            name,
		EmptyTimeout:    300, // 5 minutes
		MaxParticipants: maxParticipants,
	}

	room, err := s.roomClient.CreateRoom(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("create room: %w", err)
	}

	return room, nil
}

// DeleteRoom deletes a LiveKit room.
func (s *Service) DeleteRoom(ctx context.Context, name string) error {
	req := &livekit.DeleteRoomRequest{
		Room: name,
	}

	_, err := s.roomClient.DeleteRoom(ctx, req)
	if err != nil {
		return fmt.Errorf("delete room: %w", err)
	}

	return nil
}

// ListParticipants lists all participants in a room.
func (s *Service) ListParticipants(ctx context.Context, roomName string) ([]*livekit.ParticipantInfo, error) {
	req := &livekit.ListParticipantsRequest{
		Room: roomName,
	}

	resp, err := s.roomClient.ListParticipants(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("list participants: %w", err)
	}

	return resp.Participants, nil
}

// GetRoomInfo gets room information.
func (s *Service) GetRoomInfo(ctx context.Context, roomName string) (*livekit.Room, error) {
	rooms, err := s.roomClient.ListRooms(ctx, &livekit.ListRoomsRequest{
		Names: []string{roomName},
	})
	if err != nil {
		return nil, fmt.Errorf("get room info: %w", err)
	}

	if len(rooms.Rooms) == 0 {
		return nil, fmt.Errorf("room not found")
	}

	return rooms.Rooms[0], nil
}

// RemoveParticipant removes a participant from a room.
func (s *Service) RemoveParticipant(ctx context.Context, roomName, identity string) error {
	req := &livekit.RoomParticipantIdentity{
		Room:     roomName,
		Identity: identity,
	}

	_, err := s.roomClient.RemoveParticipant(ctx, req)
	if err != nil {
		return fmt.Errorf("remove participant: %w", err)
	}

	return nil
}

// GenerateToken generates a LiveKit access token for a user.
func (s *Service) GenerateToken(identity, roomName, metadata string, canPublish, canSubscribe bool, ttl time.Duration) (string, error) {
	at := auth.NewAccessToken(s.config.APIKey, s.config.APISecret)

	grant := &auth.VideoGrant{
		RoomJoin:     true,
		Room:         roomName,
		CanPublish:   &canPublish,
		CanSubscribe: &canSubscribe,
	}

	at.AddGrant(grant).
		SetIdentity(identity).
		SetMetadata(metadata).
		SetValidFor(ttl)

	token, err := at.ToJWT()
	if err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}

	return token, nil
}

// MuteParticipant mutes/unmutes a participant.
func (s *Service) MuteParticipant(ctx context.Context, roomName, identity string, muted bool) error {
	req := &livekit.MuteRoomTrackRequest{
		Room:     roomName,
		Identity: identity,
		Muted:    muted,
	}

	_, err := s.roomClient.MutePublishedTrack(ctx, req)
	if err != nil {
		return fmt.Errorf("mute participant: %w", err)
	}

	return nil
}
