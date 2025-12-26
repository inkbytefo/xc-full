// Package notification defines the Notification domain entities.
package notification

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrNotFound     = errors.New("notification not found")
	ErrNoPermission = errors.New("no permission to access notification")
)

// NotificationType represents the type of notification.
type NotificationType string

const (
	TypeFollow       NotificationType = "follow"
	TypeLike         NotificationType = "like"
	TypeRepost       NotificationType = "repost"
	TypeReply        NotificationType = "reply"
	TypeMention      NotificationType = "mention"
	TypeDM           NotificationType = "dm"
	TypeServerInvite NotificationType = "server_invite"
	TypeServerJoin   NotificationType = "server_join"
	TypeStreamLive   NotificationType = "stream_live"
	TypeSystem       NotificationType = "system"
)

// Notification represents a notification entity.
type Notification struct {
	ID         string
	UserID     string // The user who receives the notification
	Type       NotificationType
	ActorID    *string // The user who triggered the notification
	TargetType *string // Type of target (post, server, stream, etc.)
	TargetID   *string // ID of the target
	Message    string
	IsRead     bool
	CreatedAt  time.Time

	// Joined fields
	Actor *ActorInfo
}

// ActorInfo represents the actor who triggered the notification.
type ActorInfo struct {
	ID             string
	Handle         string
	DisplayName    string
	AvatarGradient [2]string
}

// NotificationPreferences represents user notification preferences.
type NotificationPreferences struct {
	UserID         string
	EmailEnabled   bool
	PushEnabled    bool
	DMEnabled      bool
	MentionEnabled bool
	FollowEnabled  bool
	LikeEnabled    bool
	RepostEnabled  bool
	ReplyEnabled   bool
	StreamEnabled  bool
	UpdatedAt      time.Time
}

// DefaultPreferences returns the default notification preferences.
func DefaultPreferences(userID string) *NotificationPreferences {
	return &NotificationPreferences{
		UserID:         userID,
		EmailEnabled:   true,
		PushEnabled:    true,
		DMEnabled:      true,
		MentionEnabled: true,
		FollowEnabled:  true,
		LikeEnabled:    true,
		RepostEnabled:  true,
		ReplyEnabled:   true,
		StreamEnabled:  true,
		UpdatedAt:      time.Now(),
	}
}
