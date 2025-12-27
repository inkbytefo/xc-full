// Package privacy defines privacy settings domain entities and types.
package privacy

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrNotFound       = errors.New("privacy settings not found")
	ErrInvalidSetting = errors.New("invalid privacy setting value")
)

// OnlineVisibility defines who can see user's online status
type OnlineVisibility string

const (
	OnlineVisibilityEveryone OnlineVisibility = "everyone"
	OnlineVisibilityFriends  OnlineVisibility = "friends"
	OnlineVisibilityNobody   OnlineVisibility = "nobody"
)

// IsValid checks if the online visibility value is valid
func (v OnlineVisibility) IsValid() bool {
	switch v {
	case OnlineVisibilityEveryone, OnlineVisibilityFriends, OnlineVisibilityNobody:
		return true
	}
	return false
}

// DMPermission defines who can send DMs to the user
type DMPermission string

const (
	DMPermissionEveryone      DMPermission = "everyone"
	DMPermissionFriends       DMPermission = "friends"
	DMPermissionServerMembers DMPermission = "server_members"
	DMPermissionNobody        DMPermission = "nobody"
)

// IsValid checks if the DM permission value is valid
func (p DMPermission) IsValid() bool {
	switch p {
	case DMPermissionEveryone, DMPermissionFriends, DMPermissionServerMembers, DMPermissionNobody:
		return true
	}
	return false
}

// ProfileVisibility defines who can see user's profile
type ProfileVisibility string

const (
	ProfileVisibilityPublic  ProfileVisibility = "public"
	ProfileVisibilityFriends ProfileVisibility = "friends"
	ProfileVisibilityPrivate ProfileVisibility = "private"
)

// IsValid checks if the profile visibility value is valid
func (v ProfileVisibility) IsValid() bool {
	switch v {
	case ProfileVisibilityPublic, ProfileVisibilityFriends, ProfileVisibilityPrivate:
		return true
	}
	return false
}

// FriendRequestPermission defines who can send friend requests
type FriendRequestPermission string

const (
	FriendRequestEveryone         FriendRequestPermission = "everyone"
	FriendRequestFriendsOfFriends FriendRequestPermission = "friends_of_friends"
	FriendRequestNobody           FriendRequestPermission = "nobody"
)

// IsValid checks if the friend request permission value is valid
func (p FriendRequestPermission) IsValid() bool {
	switch p {
	case FriendRequestEveryone, FriendRequestFriendsOfFriends, FriendRequestNobody:
		return true
	}
	return false
}

// Settings represents user privacy preferences
type Settings struct {
	UserID                  string
	OnlineStatusVisibility  OnlineVisibility
	DMPermission            DMPermission
	ProfileVisibility       ProfileVisibility
	ShowActivity            bool
	ReadReceiptsEnabled     bool
	TypingIndicatorsEnabled bool
	FriendRequestPermission FriendRequestPermission
	ShowServerTags          bool // Show server role tags on profile
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

// DefaultSettings returns default privacy settings for a new user
func DefaultSettings(userID string) *Settings {
	now := time.Now()
	return &Settings{
		UserID:                  userID,
		OnlineStatusVisibility:  OnlineVisibilityEveryone,
		DMPermission:            DMPermissionEveryone,
		ProfileVisibility:       ProfileVisibilityPublic,
		ShowActivity:            true,
		ReadReceiptsEnabled:     true,
		TypingIndicatorsEnabled: true,
		FriendRequestPermission: FriendRequestEveryone,
		ShowServerTags:          true,
		CreatedAt:               now,
		UpdatedAt:               now,
	}
}

// Validate checks if all settings values are valid
func (s *Settings) Validate() error {
	if !s.OnlineStatusVisibility.IsValid() {
		return ErrInvalidSetting
	}
	if !s.DMPermission.IsValid() {
		return ErrInvalidSetting
	}
	if !s.ProfileVisibility.IsValid() {
		return ErrInvalidSetting
	}
	if !s.FriendRequestPermission.IsValid() {
		return ErrInvalidSetting
	}
	return nil
}
