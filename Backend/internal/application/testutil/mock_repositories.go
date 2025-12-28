// Package testutil provides shared test utilities and mocks.
package testutil

import (
	"context"

	"github.com/stretchr/testify/mock"

	"pink/internal/domain/privacy"
	"pink/internal/domain/user"
)

// =============================================================================
// Mock User Repository
// =============================================================================

// MockUserRepository is a mock implementation of user.Repository.
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) FindByHandle(ctx context.Context, handle string) (*user.User, error) {
	args := m.Called(ctx, handle)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) Create(ctx context.Context, u *user.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUserRepository) Update(ctx context.Context, u *user.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserRepository) UpdateLastSeen(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// =============================================================================
// Mock Session Repository
// =============================================================================

// MockSessionRepository is a mock implementation of user.SessionRepository.
type MockSessionRepository struct {
	mock.Mock
}

func (m *MockSessionRepository) Create(ctx context.Context, session *user.Session) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockSessionRepository) FindByRefreshToken(ctx context.Context, refreshToken string) (*user.Session, error) {
	args := m.Called(ctx, refreshToken)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.Session), args.Error(1)
}

func (m *MockSessionRepository) FindByUserID(ctx context.Context, userID string) ([]*user.Session, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*user.Session), args.Error(1)
}

func (m *MockSessionRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockSessionRepository) DeleteByRefreshToken(ctx context.Context, refreshToken string) error {
	args := m.Called(ctx, refreshToken)
	return args.Error(0)
}

func (m *MockSessionRepository) DeleteByUserID(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockSessionRepository) DeleteExpired(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

// =============================================================================
// Mock Follow Repository
// =============================================================================

// MockFollowRepository is a mock implementation of user.FollowRepository.
type MockFollowRepository struct {
	mock.Mock
}

func (m *MockFollowRepository) Create(ctx context.Context, follow *user.Follow) error {
	args := m.Called(ctx, follow)
	return args.Error(0)
}

func (m *MockFollowRepository) Delete(ctx context.Context, followerID, followedID string) error {
	args := m.Called(ctx, followerID, followedID)
	return args.Error(0)
}

func (m *MockFollowRepository) FindByUsers(ctx context.Context, followerID, followedID string) (*user.Follow, error) {
	args := m.Called(ctx, followerID, followedID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.Follow), args.Error(1)
}

func (m *MockFollowRepository) ExistsWithStatus(ctx context.Context, followerID, followedID string, status user.FollowStatus) (bool, error) {
	args := m.Called(ctx, followerID, followedID, status)
	return args.Bool(0), args.Error(1)
}

func (m *MockFollowRepository) UpdateStatus(ctx context.Context, followerID, followedID string, status user.FollowStatus) error {
	args := m.Called(ctx, followerID, followedID, status)
	return args.Error(0)
}

func (m *MockFollowRepository) FindFollowers(ctx context.Context, userID, cursor string, limit int) ([]*user.Follow, string, error) {
	args := m.Called(ctx, userID, cursor, limit)
	if args.Get(0) == nil {
		return nil, args.String(1), args.Error(2)
	}
	return args.Get(0).([]*user.Follow), args.String(1), args.Error(2)
}

func (m *MockFollowRepository) FindFollowing(ctx context.Context, userID, cursor string, limit int) ([]*user.Follow, string, error) {
	args := m.Called(ctx, userID, cursor, limit)
	if args.Get(0) == nil {
		return nil, args.String(1), args.Error(2)
	}
	return args.Get(0).([]*user.Follow), args.String(1), args.Error(2)
}

func (m *MockFollowRepository) FindPendingRequests(ctx context.Context, userID, cursor string, limit int) ([]*user.Follow, string, error) {
	args := m.Called(ctx, userID, cursor, limit)
	if args.Get(0) == nil {
		return nil, args.String(1), args.Error(2)
	}
	return args.Get(0).([]*user.Follow), args.String(1), args.Error(2)
}

func (m *MockFollowRepository) Exists(ctx context.Context, followerID, followedID string) (bool, error) {
	args := m.Called(ctx, followerID, followedID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFollowRepository) CountFollowers(ctx context.Context, userID string) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockFollowRepository) CountFollowing(ctx context.Context, userID string) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockFollowRepository) CountPendingRequests(ctx context.Context, userID string) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

// =============================================================================
// Mock Privacy Repository
// =============================================================================

// MockPrivacyRepository is a mock implementation of privacy.Repository.
type MockPrivacyRepository struct {
	mock.Mock
}

func (m *MockPrivacyRepository) FindByUserID(ctx context.Context, userID string) (*privacy.Settings, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*privacy.Settings), args.Error(1)
}

func (m *MockPrivacyRepository) Upsert(ctx context.Context, settings *privacy.Settings) error {
	args := m.Called(ctx, settings)
	return args.Error(0)
}

func (m *MockPrivacyRepository) Delete(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}
