// Package user provides user-related application services.
package user

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"xcord/internal/domain/privacy"
	"xcord/internal/domain/user"
	"xcord/internal/infrastructure/auth"
	"xcord/internal/pkg/id"
)

// Service provides user-related operations.
type Service struct {
	userRepo    user.Repository
	sessionRepo user.SessionRepository
	followRepo  user.FollowRepository
	privacyRepo privacy.Repository
	hasher      *auth.PasswordHasher
	jwt         *auth.JWTService
}

// NewService creates a new user service.
func NewService(
	userRepo user.Repository,
	sessionRepo user.SessionRepository,
	followRepo user.FollowRepository,
	privacyRepo privacy.Repository,
	hasher *auth.PasswordHasher,
	jwt *auth.JWTService,
) *Service {
	return &Service{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		followRepo:  followRepo,
		privacyRepo: privacyRepo,
		hasher:      hasher,
		jwt:         jwt,
	}
}

// RegisterCommand represents a user registration request.
type RegisterCommand struct {
	Handle      string
	DisplayName string
	Email       string
	Password    string
}

// RegisterResult represents the result of a registration.
type RegisterResult struct {
	User                  *user.User
	AccessToken           string
	RefreshToken          string
	ExpiresIn             int64
	RefreshTokenExpiresIn int64
}

// Register creates a new user account.
func (s *Service) Register(ctx context.Context, cmd RegisterCommand) (*RegisterResult, error) {
	// Validate password
	if err := s.hasher.Validate(cmd.Password); err != nil {
		return nil, err
	}

	// Check if email exists
	existing, err := s.userRepo.FindByEmail(ctx, cmd.Email)
	if err != nil && !errors.Is(err, user.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, user.ErrEmailAlreadyExists
	}

	// Check if handle exists
	existing, err = s.userRepo.FindByHandle(ctx, cmd.Handle)
	if err != nil && !errors.Is(err, user.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, user.ErrHandleAlreadyExists
	}

	// Hash password
	hash, err := s.hasher.Hash(cmd.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	now := time.Now()
	u := &user.User{
		ID:             id.Generate("user"),
		Handle:         cmd.Handle,
		DisplayName:    cmd.DisplayName,
		Email:          cmd.Email,
		PasswordHash:   hash,
		AvatarGradient: generateAvatarGradient(),
		IsVerified:     false,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.userRepo.Create(ctx, u); err != nil {
		return nil, err
	}

	// Generate tokens
	accessToken, err := s.jwt.GenerateAccessToken(u.ID)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwt.GenerateRefreshToken(u.ID)
	if err != nil {
		return nil, err
	}

	// Store session
	session := &user.Session{
		ID:           id.Generate("sess"),
		UserID:       u.ID,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(s.jwt.GetRefreshTokenDuration()),
		CreatedAt:    now,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, err
	}

	return &RegisterResult{
		User:                  u,
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		ExpiresIn:             int64(s.jwt.GetAccessTokenDuration().Seconds()),
		RefreshTokenExpiresIn: int64(s.jwt.GetRefreshTokenDuration().Seconds()),
	}, nil
}

// LoginCommand represents a login request.
type LoginCommand struct {
	Email    string
	Password string
}

// LoginResult represents the result of a login.
type LoginResult struct {
	User                  *user.User
	AccessToken           string
	RefreshToken          string
	ExpiresIn             int64
	RefreshTokenExpiresIn int64
}

// Login authenticates a user.
func (s *Service) Login(ctx context.Context, cmd LoginCommand) (*LoginResult, error) {
	// Find user
	u, err := s.userRepo.FindByEmail(ctx, cmd.Email)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			return nil, user.ErrInvalidPassword
		}
		return nil, err
	}

	// Check if active
	if !u.IsActive {
		return nil, user.ErrUnauthorized
	}

	// Verify password
	if err := s.hasher.Verify(cmd.Password, u.PasswordHash); err != nil {
		return nil, err
	}

	// Generate tokens
	accessToken, err := s.jwt.GenerateAccessToken(u.ID)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwt.GenerateRefreshToken(u.ID)
	if err != nil {
		return nil, err
	}

	// Store session
	session := &user.Session{
		ID:           id.Generate("sess"),
		UserID:       u.ID,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(s.jwt.GetRefreshTokenDuration()),
		CreatedAt:    time.Now(),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, err
	}

	// Update last seen
	_ = s.userRepo.UpdateLastSeen(ctx, u.ID)

	return &LoginResult{
		User:                  u,
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		ExpiresIn:             int64(s.jwt.GetAccessTokenDuration().Seconds()),
		RefreshTokenExpiresIn: int64(s.jwt.GetRefreshTokenDuration().Seconds()),
	}, nil
}

// RefreshResult represents the result of a token refresh.
type RefreshResult struct {
	AccessToken           string
	RefreshToken          string
	ExpiresIn             int64
	RefreshTokenExpiresIn int64
}

// RefreshToken refreshes an access token using a refresh token.
func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (*RefreshResult, error) {
	// Validate refresh token
	claims, err := s.jwt.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Find session
	session, err := s.sessionRepo.FindByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, err
	}

	// Check if expired
	if session.IsExpired() {
		_ = s.sessionRepo.Delete(ctx, session.ID)
		return nil, user.ErrSessionExpired
	}

	// Delete old session (token rotation)
	if err := s.sessionRepo.Delete(ctx, session.ID); err != nil {
		return nil, err
	}

	// Generate new tokens
	newAccessToken, err := s.jwt.GenerateAccessToken(claims.Subject)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := s.jwt.GenerateRefreshToken(claims.Subject)
	if err != nil {
		return nil, err
	}

	// Create new session
	newSession := &user.Session{
		ID:           id.Generate("sess"),
		UserID:       claims.Subject,
		RefreshToken: newRefreshToken,
		ExpiresAt:    time.Now().Add(s.jwt.GetRefreshTokenDuration()),
		CreatedAt:    time.Now(),
	}

	if err := s.sessionRepo.Create(ctx, newSession); err != nil {
		return nil, err
	}

	return &RefreshResult{
		AccessToken:           newAccessToken,
		RefreshToken:          newRefreshToken,
		ExpiresIn:             int64(s.jwt.GetAccessTokenDuration().Seconds()),
		RefreshTokenExpiresIn: int64(s.jwt.GetRefreshTokenDuration().Seconds()),
	}, nil
}

// Logout invalidates a refresh token.
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	return s.sessionRepo.DeleteByRefreshToken(ctx, refreshToken)
}

// GetByID retrieves a user by ID.
func (s *Service) GetByID(ctx context.Context, id string) (*user.User, error) {
	return s.userRepo.FindByID(ctx, id)
}

// ValidateToken validates an access token and returns the user ID.
func (s *Service) ValidateToken(tokenString string) (string, error) {
	claims, err := s.jwt.ValidateAccessToken(tokenString)
	if err != nil {
		return "", err
	}
	return claims.Subject, nil
}

// Profile represents a user profile with stats.
type Profile struct {
	*user.User
	FollowersCount int64
	FollowingCount int64
	PostsCount     int64
	IsFollowing    bool
	IsFollowedBy   bool
}

// UpdateProfileCommand represents a profile update request.
type UpdateProfileCommand struct {
	DisplayName    *string
	Bio            *string
	AvatarGradient *[2]string
	AvatarURL      *string
	BannerURL      *string
}

// GetProfile retrieves a user's profile with stats.
func (s *Service) GetProfile(ctx context.Context, userID, viewerID string) (*Profile, error) {
	u, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Use denormalized counters from user entity
	followersCount := u.FollowersCount
	followingCount := u.FollowingCount
	postsCount := u.PostsCount

	// Check follow relationship with viewer
	var isFollowing, isFollowedBy bool
	var followStatus user.FollowStatus
	if viewerID != "" && viewerID != userID {
		// Check if viewer follows this user
		follow, _ := s.followRepo.FindByUsers(ctx, viewerID, userID)
		if follow != nil {
			isFollowing = follow.Status == user.FollowStatusActive
			followStatus = follow.Status
		}
		// Check if this user follows viewer
		isFollowedBy, _ = s.followRepo.ExistsWithStatus(ctx, userID, viewerID, user.FollowStatusActive)
	}
	_ = followStatus // TODO: expose in response if needed

	return &Profile{
		User:           u,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
		PostsCount:     postsCount,
		IsFollowing:    isFollowing,
		IsFollowedBy:   isFollowedBy,
	}, nil
}

// UpdateProfile updates a user's profile.
func (s *Service) UpdateProfile(ctx context.Context, userID string, cmd UpdateProfileCommand) (*user.User, error) {
	u, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if cmd.DisplayName != nil {
		u.DisplayName = *cmd.DisplayName
	}
	if cmd.Bio != nil {
		u.Bio = *cmd.Bio
	}
	if cmd.AvatarGradient != nil {
		u.AvatarGradient = *cmd.AvatarGradient
	}
	if cmd.AvatarURL != nil {
		u.AvatarURL = *cmd.AvatarURL
	}
	if cmd.BannerURL != nil {
		u.BannerURL = *cmd.BannerURL
	}

	if err := s.userRepo.Update(ctx, u); err != nil {
		return nil, err
	}

	return u, nil
}

// FollowResult represents the result of a follow action.
type FollowResult struct {
	Status  user.FollowStatus
	Pending bool
}

// Follow creates a follow relationship with privacy-aware status.
func (s *Service) Follow(ctx context.Context, followerID, followedID string) (*FollowResult, error) {
	// Can't follow yourself
	if followerID == followedID {
		return nil, errors.New("cannot follow yourself")
	}

	// Verify target user exists
	_, err := s.userRepo.FindByID(ctx, followedID)
	if err != nil {
		return nil, err
	}

	// Check if already following or pending
	existing, err := s.followRepo.FindByUsers(ctx, followerID, followedID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.Status == user.FollowStatusBlocked {
			return nil, errors.New("you are blocked by this user")
		}
		return &FollowResult{Status: existing.Status, Pending: existing.IsPending()}, nil
	}

	// Check target's privacy settings
	status := user.FollowStatusActive
	if s.privacyRepo != nil {
		settings, err := s.privacyRepo.FindByUserID(ctx, followedID)
		if err == nil && settings != nil {
			if settings.ProfileVisibility == privacy.ProfileVisibilityPrivate {
				status = user.FollowStatusPending
			}
		}
	}

	follow := &user.Follow{
		FollowerID: followerID,
		FollowedID: followedID,
		Status:     status,
	}

	if err := s.followRepo.Create(ctx, follow); err != nil {
		return nil, err
	}

	return &FollowResult{Status: status, Pending: status == user.FollowStatusPending}, nil
}

// Unfollow removes a follow relationship.
func (s *Service) Unfollow(ctx context.Context, followerID, followedID string) error {
	return s.followRepo.Delete(ctx, followerID, followedID)
}

// AcceptFollowRequest accepts a pending follow request.
func (s *Service) AcceptFollowRequest(ctx context.Context, targetID, requesterID string) error {
	// Verify the request exists and is pending
	follow, err := s.followRepo.FindByUsers(ctx, requesterID, targetID)
	if err != nil {
		return err
	}
	if follow == nil {
		return errors.New("follow request not found")
	}
	if follow.Status != user.FollowStatusPending {
		return errors.New("not a pending request")
	}

	// Update status to active
	return s.followRepo.UpdateStatus(ctx, requesterID, targetID, user.FollowStatusActive)
}

// RejectFollowRequest rejects a pending follow request.
func (s *Service) RejectFollowRequest(ctx context.Context, targetID, requesterID string) error {
	// Just delete the pending request
	return s.followRepo.Delete(ctx, requesterID, targetID)
}

// GetPendingRequests retrieves pending follow requests for a user.
func (s *Service) GetPendingRequests(ctx context.Context, userID, cursor string, limit int) ([]*user.User, string, error) {
	follows, nextCursor, err := s.followRepo.FindPendingRequests(ctx, userID, cursor, limit)
	if err != nil {
		return nil, "", err
	}

	users := make([]*user.User, 0, len(follows))
	for _, f := range follows {
		u, err := s.userRepo.FindByID(ctx, f.FollowerID)
		if err != nil {
			continue
		}
		users = append(users, u)
	}

	return users, nextCursor, nil
}

// BlockUser blocks a user.
func (s *Service) BlockUser(ctx context.Context, blockerID, blockedID string) error {
	// Check if there's an existing relationship
	existing, _ := s.followRepo.FindByUsers(ctx, blockedID, blockerID)
	if existing != nil {
		// Update to blocked
		return s.followRepo.UpdateStatus(ctx, blockedID, blockerID, user.FollowStatusBlocked)
	}

	// Create a blocked relationship
	follow := &user.Follow{
		FollowerID: blockedID,
		FollowedID: blockerID,
		Status:     user.FollowStatusBlocked,
	}
	return s.followRepo.Create(ctx, follow)
}

// GetFollowers retrieves a user's followers.
func (s *Service) GetFollowers(ctx context.Context, userID, cursor string, limit int) ([]*user.User, string, error) {
	follows, nextCursor, err := s.followRepo.FindFollowers(ctx, userID, cursor, limit)
	if err != nil {
		return nil, "", err
	}

	users := make([]*user.User, 0, len(follows))
	for _, f := range follows {
		u, err := s.userRepo.FindByID(ctx, f.FollowerID)
		if err != nil {
			continue // Skip if user not found
		}
		users = append(users, u)
	}

	return users, nextCursor, nil
}

// GetFollowing retrieves users that a user is following.
func (s *Service) GetFollowing(ctx context.Context, userID, cursor string, limit int) ([]*user.User, string, error) {
	follows, nextCursor, err := s.followRepo.FindFollowing(ctx, userID, cursor, limit)
	if err != nil {
		return nil, "", err
	}

	users := make([]*user.User, 0, len(follows))
	for _, f := range follows {
		u, err := s.userRepo.FindByID(ctx, f.FollowedID)
		if err != nil {
			continue // Skip if user not found
		}
		users = append(users, u)
	}

	return users, nextCursor, nil
}

func generateAvatarGradient() [2]string {
	// Predefined set of beautiful gradients
	gradients := [][2]string{
		{"#ff6b6b", "#4ecdc4"},
		{"#a18cd1", "#fbc2eb"},
		{"#ff9a9e", "#fecfef"},
		{"#667eea", "#764ba2"},
		{"#f093fb", "#f5576c"},
		{"#4facfe", "#00f2fe"},
		{"#43e97b", "#38f9d7"},
		{"#fa709a", "#fee140"},
		{"#30cfd0", "#330867"},
		{"#a8edea", "#fed6e3"},
	}

	// Use UUID to pick a gradient
	id := uuid.New()
	idx := int(id[0]) % len(gradients)
	return gradients[idx]
}
