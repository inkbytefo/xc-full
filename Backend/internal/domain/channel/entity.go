// Package channel defines the Channel domain entity and related types.
package channel

import (
	"errors"
	"time"

	"xcord/internal/domain/server"
)

// Domain errors
var (
	ErrNotFound     = errors.New("channel not found")
	ErrInvalidType  = errors.New("invalid channel type")
	ErrNoPermission = errors.New("no permission to access channel")
)

// ChannelType represents the type of channel.
type ChannelType string

const (
	TypeText         ChannelType = "text"
	TypeVoice        ChannelType = "voice"
	TypeAnnouncement ChannelType = "announcement"
	TypeCategory     ChannelType = "category" // RBAC 2.0: Category container
)

// IsValid checks if the channel type is valid.
func (t ChannelType) IsValid() bool {
	switch t {
	case TypeText, TypeVoice, TypeAnnouncement, TypeCategory:
		return true
	}
	return false
}

// IsCategory checks if this is a category container.
func (t ChannelType) IsCategory() bool {
	return t == TypeCategory
}

// Channel represents a channel entity in the domain.
type Channel struct {
	ID          string
	ServerID    string
	ParentID    *string // RBAC 2.0: Category parent (nil if top-level or is a category)
	Name        string
	Description string
	Type        ChannelType
	Position    int
	IsPrivate   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time

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
