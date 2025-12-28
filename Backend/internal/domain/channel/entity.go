// Package channel defines the Channel domain entity and related types.
package channel

import (
	"errors"
	"time"

	"pink/internal/domain/server"
)

// Domain errors
var (
	ErrNotFound     = errors.New("channel not found")
	ErrInvalidType  = errors.New("invalid channel type")
	ErrNoPermission = errors.New("no permission to access channel")
	ErrChannelFull  = errors.New("channel is full")
)

// ChannelType represents the type of channel.
type ChannelType string

const (
	TypeText         ChannelType = "text"         // Text-only chat channel
	TypeAnnouncement ChannelType = "announcement" // Broadcast channel (read-only for most)
	TypeCategory     ChannelType = "category"     // Category container for organizing channels
	TypeHybrid       ChannelType = "hybrid"       // Text + Voice + Video combined
)

// IsValid checks if the channel type is valid.
func (t ChannelType) IsValid() bool {
	switch t {
	case TypeText, TypeAnnouncement, TypeCategory, TypeHybrid:
		return true
	}
	return false
}

// IsCategory checks if this is a category container.
func (t ChannelType) IsCategory() bool {
	return t == TypeCategory
}

// IsVoiceEnabled checks if this channel type supports voice/video.
func (t ChannelType) IsVoiceEnabled() bool {
	return t == TypeHybrid
}

// IsTextEnabled checks if this channel type supports text messages.
func (t ChannelType) IsTextEnabled() bool {
	return t == TypeText || t == TypeAnnouncement || t == TypeHybrid
}

// Channel represents a channel entity in the domain.
type Channel struct {
	ID          string
	ServerID    string
	ParentID    *string // Category parent (nil if top-level or is a category)
	Name        string
	Description string
	Type        ChannelType
	Position    int
	IsPrivate   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time

	// Voice/Video capabilities (for voice-enabled channel types)
	UserLimit   int    // 0 = unlimited
	Bitrate     int    // Audio bitrate in kbps (default: 64)
	LiveKitRoom string // LiveKit room name for voice/video

	// Runtime state (populated when needed)
	ParticipantCount int

	// Joined fields - populated when needed
	PermissionOverwrites []PermissionOverwrite
}

// ============================================================================
// PERMISSION OVERWRITE (RBAC 2.0)
// ============================================================================

// OverwriteTargetType indicates whether the overwrite targets a role or member.
type OverwriteTargetType string

const (
	OverwriteTargetRole   OverwriteTargetType = "role"
	OverwriteTargetMember OverwriteTargetType = "member"
)

// PermissionOverwrite represents a permission override for a channel.
type PermissionOverwrite struct {
	ID         string
	ChannelID  string
	TargetType OverwriteTargetType
	TargetID   string            // role_id or member_id depending on TargetType
	Allow      server.Permission // Bitwise: explicitly allowed
	Deny       server.Permission // Bitwise: explicitly denied
}

// ============================================================================
// CHANNEL MESSAGE
// ============================================================================

// ChannelMessage represents a message in a channel.
type ChannelMessage struct {
	ID        string
	ChannelID string
	ServerID  string
	AuthorID  string
	Content   string
	IsEdited  bool
	IsPinned  bool
	ReplyToID *string
	CreatedAt time.Time
	UpdatedAt time.Time

	// Joined fields
	Author *MessageAuthor
}

// MessageAuthor represents the author info in a message.
type MessageAuthor struct {
	ID             string
	Handle         string
	DisplayName    string
	AvatarGradient [2]string
}

// Domain errors for messages
var (
	ErrMessageNotFound     = errors.New("message not found")
	ErrMessageNoPermission = errors.New("no permission to modify message")
	ErrInvalidContent      = errors.New("invalid message content")
)
