// Package privacy provides privacy-related application services.
package privacy

import (
	"context"
	"errors"

	"pink/internal/domain/privacy"
	"pink/internal/domain/user"
)

// Service provides privacy-related operations.
type Service struct {
	privacyRepo privacy.Repository
	followRepo  user.FollowRepository
}

// NewService creates a new privacy service.
func NewService(
	privacyRepo privacy.Repository,
	followRepo user.FollowRepository,
) *Service {
	return &Service{
		privacyRepo: privacyRepo,
		followRepo:  followRepo,
	}
}

// UpdateCommand represents a privacy settings update request.
type UpdateCommand struct {
	OnlineStatusVisibility  *string
	DMPermission            *string
	ProfileVisibility       *string
	ShowActivity            *bool
	ReadReceiptsEnabled     *bool
	TypingIndicatorsEnabled *bool
	FriendRequestPermission *string
	ShowServerTags          *bool
}

// GetSettings returns user's privacy settings (creates default if not exists).
func (s *Service) GetSettings(ctx context.Context, userID string) (*privacy.Settings, error) {
	settings, err := s.privacyRepo.FindByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, privacy.ErrNotFound) {
			// Create default settings for new user
			settings = privacy.DefaultSettings(userID)
			if err := s.privacyRepo.Upsert(ctx, settings); err != nil {
				return nil, err
			}
			return settings, nil
		}
		return nil, err
	}
	return settings, nil
}

// UpdateSettings updates user's privacy settings.
func (s *Service) UpdateSettings(ctx context.Context, userID string, cmd UpdateCommand) (*privacy.Settings, error) {
	// Get existing settings or create default
	settings, err := s.GetSettings(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if cmd.OnlineStatusVisibility != nil {
		v := privacy.OnlineVisibility(*cmd.OnlineStatusVisibility)
		if !v.IsValid() {
			return nil, privacy.ErrInvalidSetting
		}
		settings.OnlineStatusVisibility = v
	}

	if cmd.DMPermission != nil {
		p := privacy.DMPermission(*cmd.DMPermission)
		if !p.IsValid() {
			return nil, privacy.ErrInvalidSetting
		}
		settings.DMPermission = p
	}

	if cmd.ProfileVisibility != nil {
		v := privacy.ProfileVisibility(*cmd.ProfileVisibility)
		if !v.IsValid() {
			return nil, privacy.ErrInvalidSetting
		}
		settings.ProfileVisibility = v
	}

	if cmd.ShowActivity != nil {
		settings.ShowActivity = *cmd.ShowActivity
	}

	if cmd.ReadReceiptsEnabled != nil {
		settings.ReadReceiptsEnabled = *cmd.ReadReceiptsEnabled
	}

	if cmd.TypingIndicatorsEnabled != nil {
		settings.TypingIndicatorsEnabled = *cmd.TypingIndicatorsEnabled
	}

	if cmd.FriendRequestPermission != nil {
		p := privacy.FriendRequestPermission(*cmd.FriendRequestPermission)
		if !p.IsValid() {
			return nil, privacy.ErrInvalidSetting
		}
		settings.FriendRequestPermission = p
	}

	if cmd.ShowServerTags != nil {
		settings.ShowServerTags = *cmd.ShowServerTags
	}

	// Save updated settings
	if err := s.privacyRepo.Upsert(ctx, settings); err != nil {
		return nil, err
	}

	return settings, nil
}

// CanViewOnlineStatus checks if viewer can see target's online status.
func (s *Service) CanViewOnlineStatus(ctx context.Context, viewerID, targetID string) (bool, error) {
	// User can always see their own status
	if viewerID == targetID {
		return true, nil
	}

	settings, err := s.GetSettings(ctx, targetID)
	if err != nil {
		return false, err
	}

	switch settings.OnlineStatusVisibility {
	case privacy.OnlineVisibilityEveryone:
		return true, nil
	case privacy.OnlineVisibilityFriends:
		// Check if they are friends (mutual follow)
		isFriend, err := s.areFriends(ctx, viewerID, targetID)
		if err != nil {
			return false, err
		}
		return isFriend, nil
	case privacy.OnlineVisibilityNobody:
		return false, nil
	}

	return false, nil
}

// CanSendDM checks if sender can send DM to recipient.
func (s *Service) CanSendDM(ctx context.Context, senderID, recipientID string) (bool, error) {
	// User can always message themselves (notes)
	if senderID == recipientID {
		return true, nil
	}

	settings, err := s.GetSettings(ctx, recipientID)
	if err != nil {
		return false, err
	}

	switch settings.DMPermission {
	case privacy.DMPermissionEveryone:
		return true, nil
	case privacy.DMPermissionFriends:
		return s.areFriends(ctx, senderID, recipientID)
	case privacy.DMPermissionServerMembers:
		// TODO: Check if they share a server
		// For now, allow if they are friends or return true
		return true, nil
	case privacy.DMPermissionNobody:
		return false, nil
	}

	return false, nil
}

// CanViewProfile checks if viewer can see target's full profile.
func (s *Service) CanViewProfile(ctx context.Context, viewerID, targetID string) (bool, error) {
	// User can always see their own profile
	if viewerID == targetID {
		return true, nil
	}

	settings, err := s.GetSettings(ctx, targetID)
	if err != nil {
		return false, err
	}

	switch settings.ProfileVisibility {
	case privacy.ProfileVisibilityPublic:
		return true, nil
	case privacy.ProfileVisibilityFriends:
		return s.areFriends(ctx, viewerID, targetID)
	case privacy.ProfileVisibilityPrivate:
		return false, nil
	}

	return false, nil
}

// CanSendFriendRequest checks if sender can send friend request to target.
func (s *Service) CanSendFriendRequest(ctx context.Context, senderID, targetID string) (bool, error) {
	// Can't friend yourself
	if senderID == targetID {
		return false, nil
	}

	settings, err := s.GetSettings(ctx, targetID)
	if err != nil {
		return false, err
	}

	switch settings.FriendRequestPermission {
	case privacy.FriendRequestEveryone:
		return true, nil
	case privacy.FriendRequestFriendsOfFriends:
		// TODO: Implement friends of friends check
		// For now, allow everyone
		return true, nil
	case privacy.FriendRequestNobody:
		return false, nil
	}

	return false, nil
}

// ShouldShowReadReceipts checks if read receipts should be shown to viewer.
func (s *Service) ShouldShowReadReceipts(ctx context.Context, userID string) (bool, error) {
	settings, err := s.GetSettings(ctx, userID)
	if err != nil {
		return true, err // Default to showing
	}
	return settings.ReadReceiptsEnabled, nil
}

// ShouldShowTypingIndicator checks if typing indicator should be shown.
func (s *Service) ShouldShowTypingIndicator(ctx context.Context, userID string) (bool, error) {
	settings, err := s.GetSettings(ctx, userID)
	if err != nil {
		return true, err // Default to showing
	}
	return settings.TypingIndicatorsEnabled, nil
}

// ShouldShowActivity checks if activity status should be shown.
func (s *Service) ShouldShowActivity(ctx context.Context, userID string) (bool, error) {
	settings, err := s.GetSettings(ctx, userID)
	if err != nil {
		return true, err // Default to showing
	}
	return settings.ShowActivity, nil
}

// areFriends checks if two users are mutual friends (both follow each other).
func (s *Service) areFriends(ctx context.Context, userID1, userID2 string) (bool, error) {
	// Check if user1 follows user2
	follows1, err := s.followRepo.Exists(ctx, userID1, userID2)
	if err != nil {
		return false, err
	}
	if !follows1 {
		return false, nil
	}

	// Check if user2 follows user1
	follows2, err := s.followRepo.Exists(ctx, userID2, userID1)
	if err != nil {
		return false, err
	}

	return follows2, nil
}
