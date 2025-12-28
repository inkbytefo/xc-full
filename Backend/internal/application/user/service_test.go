package user

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"pink/internal/application/testutil"
	"pink/internal/config"
	"pink/internal/domain/user"
	"pink/internal/infrastructure/auth"
)

// setupTestService creates a service with mocked dependencies.
func setupTestService(t *testing.T) (*Service, *testutil.MockUserRepository, *testutil.MockSessionRepository, *testutil.MockFollowRepository) {
	userRepo := new(testutil.MockUserRepository)
	sessionRepo := new(testutil.MockSessionRepository)
	followRepo := new(testutil.MockFollowRepository)
	privacyRepo := new(testutil.MockPrivacyRepository)

	hasher := auth.NewPasswordHasher(10)

	// Create JWT service with test keys
	jwtCfg := &config.JWTConfig{
		PrivateKeyPath:       "../../infrastructure/auth/testdata/jwt_private.pem",
		PublicKeyPath:        "../../infrastructure/auth/testdata/jwt_public.pem",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 168 * time.Hour,
	}
	jwt, err := auth.NewJWTService(jwtCfg)
	require.NoError(t, err)

	svc := NewService(userRepo, sessionRepo, followRepo, privacyRepo, hasher, jwt)
	return svc, userRepo, sessionRepo, followRepo
}

// =============================================================================
// Register Tests
// =============================================================================

func TestService_Register_Success(t *testing.T) {
	svc, userRepo, sessionRepo, _ := setupTestService(t)
	ctx := context.Background()

	// Setup mocks
	userRepo.On("FindByEmail", ctx, "test@example.com").Return(nil, user.ErrNotFound)
	userRepo.On("FindByHandle", ctx, "testuser").Return(nil, user.ErrNotFound)
	userRepo.On("Create", ctx, mock.AnythingOfType("*user.User")).Return(nil)
	sessionRepo.On("Create", ctx, mock.AnythingOfType("*user.Session")).Return(nil)

	// Execute
	result, err := svc.Register(ctx, RegisterCommand{
		Handle:      "testuser",
		DisplayName: "Test User",
		Email:       "test@example.com",
		Password:    "SecurePass123",
	})

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result.User)
	assert.Equal(t, "testuser", result.User.Handle)
	assert.Equal(t, "test@example.com", result.User.Email)
	assert.NotEmpty(t, result.AccessToken)
	assert.NotEmpty(t, result.RefreshToken)
	assert.Greater(t, result.ExpiresIn, int64(0))

	userRepo.AssertExpectations(t)
	sessionRepo.AssertExpectations(t)
}

func TestService_Register_EmailExists(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	existingUser := &user.User{ID: "existing", Email: "test@example.com"}
	userRepo.On("FindByEmail", ctx, "test@example.com").Return(existingUser, nil)

	result, err := svc.Register(ctx, RegisterCommand{
		Handle:      "testuser",
		DisplayName: "Test User",
		Email:       "test@example.com",
		Password:    "SecurePass123",
	})

	assert.Nil(t, result)
	assert.ErrorIs(t, err, user.ErrEmailAlreadyExists)
}

func TestService_Register_HandleExists(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	userRepo.On("FindByEmail", ctx, "test@example.com").Return(nil, user.ErrNotFound)
	existingUser := &user.User{ID: "existing", Handle: "testuser"}
	userRepo.On("FindByHandle", ctx, "testuser").Return(existingUser, nil)

	result, err := svc.Register(ctx, RegisterCommand{
		Handle:      "testuser",
		DisplayName: "Test User",
		Email:       "test@example.com",
		Password:    "SecurePass123",
	})

	assert.Nil(t, result)
	assert.ErrorIs(t, err, user.ErrHandleAlreadyExists)
}

func TestService_Register_WeakPassword(t *testing.T) {
	svc, _, _, _ := setupTestService(t)
	ctx := context.Background()

	result, err := svc.Register(ctx, RegisterCommand{
		Handle:      "testuser",
		DisplayName: "Test User",
		Email:       "test@example.com",
		Password:    "weak",
	})

	assert.Nil(t, result)
	assert.Error(t, err)
}

func TestService_Register_ReservedHandle(t *testing.T) {
	svc, _, _, _ := setupTestService(t)
	ctx := context.Background()

	result, err := svc.Register(ctx, RegisterCommand{
		Handle:      "admin",
		DisplayName: "Admin",
		Email:       "admin@example.com",
		Password:    "SecurePass123",
	})

	assert.Nil(t, result)
	assert.Error(t, err)
}

// =============================================================================
// Login Tests
// =============================================================================

func TestService_Login_Success(t *testing.T) {
	svc, userRepo, sessionRepo, _ := setupTestService(t)
	ctx := context.Background()

	// Create test user with hashed password
	hasher := auth.NewPasswordHasher(10)
	hash, _ := hasher.Hash("SecurePass123")
	testUser := &user.User{
		ID:           "user_12345678901234567",
		Handle:       "testuser",
		Email:        "test@example.com",
		PasswordHash: hash,
		IsActive:     true,
	}

	userRepo.On("FindByHandle", ctx, "testuser").Return(testUser, nil)
	sessionRepo.On("Create", ctx, mock.AnythingOfType("*user.Session")).Return(nil)
	userRepo.On("UpdateLastSeen", ctx, testUser.ID).Return(nil)

	result, err := svc.Login(ctx, LoginCommand{
		Handle:   "testuser",
		Password: "SecurePass123",
	})

	require.NoError(t, err)
	assert.NotNil(t, result.User)
	assert.Equal(t, testUser.ID, result.User.ID)
	assert.NotEmpty(t, result.AccessToken)
	assert.NotEmpty(t, result.RefreshToken)
}

func TestService_Login_WrongPassword(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	hasher := auth.NewPasswordHasher(10)
	hash, _ := hasher.Hash("CorrectPassword123")
	testUser := &user.User{
		ID:           "user_12345678901234567",
		Handle:       "testuser",
		PasswordHash: hash,
		IsActive:     true,
	}

	userRepo.On("FindByHandle", ctx, "testuser").Return(testUser, nil)

	result, err := svc.Login(ctx, LoginCommand{
		Handle:   "testuser",
		Password: "WrongPassword123",
	})

	assert.Nil(t, result)
	assert.Error(t, err)
}

func TestService_Login_UserNotFound(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	userRepo.On("FindByHandle", ctx, "nonexistent").Return(nil, user.ErrNotFound)

	result, err := svc.Login(ctx, LoginCommand{
		Handle:   "nonexistent",
		Password: "SomePassword123",
	})

	assert.Nil(t, result)
	assert.ErrorIs(t, err, user.ErrInvalidPassword)
}

func TestService_Login_InactiveUser(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	testUser := &user.User{
		ID:       "user_12345678901234567",
		Handle:   "inactive",
		IsActive: false,
	}

	userRepo.On("FindByHandle", ctx, "inactive").Return(testUser, nil)

	result, err := svc.Login(ctx, LoginCommand{
		Handle:   "inactive",
		Password: "SomePassword123",
	})

	assert.Nil(t, result)
	assert.ErrorIs(t, err, user.ErrUnauthorized)
}

func TestService_Login_StripsAtSign(t *testing.T) {
	svc, userRepo, sessionRepo, _ := setupTestService(t)
	ctx := context.Background()

	hasher := auth.NewPasswordHasher(10)
	hash, _ := hasher.Hash("SecurePass123")
	testUser := &user.User{
		ID:           "user_12345678901234567",
		Handle:       "testuser",
		PasswordHash: hash,
		IsActive:     true,
	}

	// Should strip @ and look for "testuser"
	userRepo.On("FindByHandle", ctx, "testuser").Return(testUser, nil)
	sessionRepo.On("Create", ctx, mock.AnythingOfType("*user.Session")).Return(nil)
	userRepo.On("UpdateLastSeen", ctx, testUser.ID).Return(nil)

	result, err := svc.Login(ctx, LoginCommand{
		Handle:   "@testuser",
		Password: "SecurePass123",
	})

	require.NoError(t, err)
	assert.NotNil(t, result)
}

// =============================================================================
// Logout Tests
// =============================================================================

func TestService_Logout(t *testing.T) {
	svc, _, sessionRepo, _ := setupTestService(t)
	ctx := context.Background()

	sessionRepo.On("DeleteByRefreshToken", ctx, "test-refresh-token").Return(nil)

	err := svc.Logout(ctx, "test-refresh-token")

	assert.NoError(t, err)
	sessionRepo.AssertExpectations(t)
}

// =============================================================================
// GetByID Tests
// =============================================================================

func TestService_GetByID_Success(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	testUser := &user.User{
		ID:     "user_12345678901234567",
		Handle: "testuser",
	}

	userRepo.On("FindByID", ctx, "user_12345678901234567").Return(testUser, nil)

	result, err := svc.GetByID(ctx, "user_12345678901234567")

	require.NoError(t, err)
	assert.Equal(t, testUser.ID, result.ID)
}

func TestService_GetByID_NotFound(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	userRepo.On("FindByID", ctx, "nonexistent").Return(nil, user.ErrNotFound)

	result, err := svc.GetByID(ctx, "nonexistent")

	assert.Nil(t, result)
	assert.ErrorIs(t, err, user.ErrNotFound)
}

// =============================================================================
// UpdateProfile Tests
// =============================================================================

func TestService_UpdateProfile_Success(t *testing.T) {
	svc, userRepo, _, _ := setupTestService(t)
	ctx := context.Background()

	testUser := &user.User{
		ID:          "user_12345678901234567",
		Handle:      "testuser",
		DisplayName: "Old Name",
		Bio:         "Old Bio",
	}

	newName := "New Name"
	newBio := "New Bio"

	userRepo.On("FindByID", ctx, "user_12345678901234567").Return(testUser, nil)
	userRepo.On("Update", ctx, mock.AnythingOfType("*user.User")).Return(nil)

	result, err := svc.UpdateProfile(ctx, "user_12345678901234567", UpdateProfileCommand{
		DisplayName: &newName,
		Bio:         &newBio,
	})

	require.NoError(t, err)
	assert.Equal(t, "New Name", result.DisplayName)
	assert.Equal(t, "New Bio", result.Bio)
}

// =============================================================================
// Follow Tests
// =============================================================================

func TestService_Follow_Success(t *testing.T) {
	svc, userRepo, _, followRepo := setupTestService(t)
	ctx := context.Background()

	targetUser := &user.User{ID: "user_target123456789012"}

	userRepo.On("FindByID", ctx, "user_target123456789012").Return(targetUser, nil)
	followRepo.On("FindByUsers", ctx, "user_follower123456789", "user_target123456789012").Return(nil, nil)
	followRepo.On("Create", ctx, mock.AnythingOfType("*user.Follow")).Return(nil)

	result, err := svc.Follow(ctx, "user_follower123456789", "user_target123456789012")

	require.NoError(t, err)
	assert.Equal(t, user.FollowStatusActive, result.Status)
	assert.False(t, result.Pending)
}

func TestService_Follow_CannotFollowSelf(t *testing.T) {
	svc, _, _, _ := setupTestService(t)
	ctx := context.Background()

	result, err := svc.Follow(ctx, "user_12345678901234567", "user_12345678901234567")

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot follow yourself")
}

func TestService_Unfollow(t *testing.T) {
	svc, _, _, followRepo := setupTestService(t)
	ctx := context.Background()

	followRepo.On("Delete", ctx, "follower_id", "followed_id").Return(nil)

	err := svc.Unfollow(ctx, "follower_id", "followed_id")

	assert.NoError(t, err)
	followRepo.AssertExpectations(t)
}
