// Package voice defines the Voice/Video channel domain entities.
package voice

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrChannelNotFound    = errors.New("voice channel not found")
	ErrRoomNotFound       = errors.New("room not found")
	ErrAlreadyInChannel   = errors.New("already in a voice channel")
	ErrNotInChannel       = errors.New("not in voice channel")
	ErrNoPermission       = errors.New("no permission")
	ErrChannelFull        = errors.New("voice channel is full")
)

// ChannelType represents the type of voice channel.
type ChannelType string

const (
	TypeVoice ChannelType = "voice"
	TypeVideo ChannelType = "video"
	TypeStage ChannelType = "stage"
)

// VoiceChannel represents a voice/video channel in a server.
type VoiceChannel struct {
	ID            string
	ServerID      string
	Name          string
	Type          ChannelType
	Position      int
	UserLimit     int           // 0 = unlimited
	Bitrate       int           // Audio bitrate in kbps
	LiveKitRoom   string        // LiveKit room name
	CreatedAt     time.Time
	UpdatedAt     time.Time

	// Runtime state
	ParticipantCount int
	Participants     []*Participant
}

// Participant represents a user in a voice channel.
type Participant struct {
	UserID      string
	ChannelID   string
	IsMuted     bool
	IsDeafened  bool
	IsSpeaking  bool
	IsVideoOn   bool
	IsScreening bool
	JoinedAt    time.Time

	// Joined user info
	Handle      string
	DisplayName string
	AvatarGradient [2]string
}

// Room represents a LiveKit room state.
type Room struct {
	Name              string
	SID               string
	NumParticipants   int
	MaxParticipants   int
	CreatedAt         time.Time
	EmptyTimeout      int
	Metadata          string
}

// AccessToken represents a LiveKit access token config.
type AccessToken struct {
	Identity    string
	RoomName    string
	RoomJoin    bool
	CanPublish  bool
	CanSubscribe bool
	ExpiresAt   time.Time
}
