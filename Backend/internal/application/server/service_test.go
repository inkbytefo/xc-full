package server_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	appserver "xcord/internal/application/server"
	"xcord/internal/domain/server"
)

type mockServerRepo struct {
	mock.Mock
}

func (m *mockServerRepo) FindByID(ctx context.Context, id string) (*server.Server, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Server), args.Error(1)
}

func (m *mockServerRepo) FindByUserID(ctx context.Context, userID string) ([]*server.Server, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Server), args.Error(1)
}

func (m *mockServerRepo) Create(ctx context.Context, srv *server.Server) error {
	args := m.Called(ctx, srv)
	return args.Error(0)
}

func (m *mockServerRepo) Update(ctx context.Context, srv *server.Server) error {
	args := m.Called(ctx, srv)
	return args.Error(0)
}

func (m *mockServerRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockServerRepo) IncrementMemberCount(ctx context.Context, id string, delta int) error {
	args := m.Called(ctx, id, delta)
	return args.Error(0)
}

type mockMemberRepo struct {
	mock.Mock
}

func (m *mockMemberRepo) FindByServerID(ctx context.Context, serverID string) ([]*server.Member, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Member), args.Error(1)
}

func (m *mockMemberRepo) FindByServerAndUser(ctx context.Context, serverID, userID string) (*server.Member, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Member), args.Error(1)
}

func (m *mockMemberRepo) FindByServerAndUserWithRoles(ctx context.Context, serverID, userID string) (*server.Member, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Member), args.Error(1)
}

func (m *mockMemberRepo) Create(ctx context.Context, member *server.Member) error {
	args := m.Called(ctx, member)
	return args.Error(0)
}

func (m *mockMemberRepo) Delete(ctx context.Context, serverID, userID string) error {
	args := m.Called(ctx, serverID, userID)
	return args.Error(0)
}

func (m *mockMemberRepo) AssignRole(ctx context.Context, memberID, roleID string) error {
	args := m.Called(ctx, memberID, roleID)
	return args.Error(0)
}

func (m *mockMemberRepo) RemoveRole(ctx context.Context, memberID, roleID string) error {
	args := m.Called(ctx, memberID, roleID)
	return args.Error(0)
}

func (m *mockMemberRepo) IsMember(ctx context.Context, serverID, userID string) (bool, error) {
	args := m.Called(ctx, serverID, userID)
	return args.Bool(0), args.Error(1)
}

func (m *mockMemberRepo) Update(ctx context.Context, member *server.Member) error {
	args := m.Called(ctx, member)
	return args.Error(0)
}

type mockRoleRepo struct {
	mock.Mock
}

func (m *mockRoleRepo) FindByID(ctx context.Context, id string) (*server.Role, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Role), args.Error(1)
}

func (m *mockRoleRepo) FindByServerID(ctx context.Context, serverID string) ([]*server.Role, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Role), args.Error(1)
}

func (m *mockRoleRepo) FindDefaultRole(ctx context.Context, serverID string) (*server.Role, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Role), args.Error(1)
}

func (m *mockRoleRepo) FindByMemberID(ctx context.Context, memberID string) ([]*server.Role, error) {
	args := m.Called(ctx, memberID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Role), args.Error(1)
}

func (m *mockRoleRepo) Create(ctx context.Context, role *server.Role) error {
	args := m.Called(ctx, role)
	return args.Error(0)
}

func (m *mockRoleRepo) Update(ctx context.Context, role *server.Role) error {
	args := m.Called(ctx, role)
	return args.Error(0)
}

func (m *mockRoleRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRoleRepo) UpdatePositions(ctx context.Context, serverID string, positions map[string]int) error {
	args := m.Called(ctx, serverID, positions)
	return args.Error(0)
}

type mockJoinRequestRepo struct {
	mock.Mock
}

func (m *mockJoinRequestRepo) Create(ctx context.Context, req *server.JoinRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *mockJoinRequestRepo) UpdateStatus(ctx context.Context, serverID, userID string, status server.JoinRequestStatus) error {
	args := m.Called(ctx, serverID, userID, status)
	return args.Error(0)
}

func (m *mockJoinRequestRepo) Delete(ctx context.Context, serverID, userID string) error {
	args := m.Called(ctx, serverID, userID)
	return args.Error(0)
}

func (m *mockJoinRequestRepo) FindByServerAndUser(ctx context.Context, serverID, userID string) (*server.JoinRequest, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.JoinRequest), args.Error(1)
}

func (m *mockJoinRequestRepo) FindPendingByServerID(ctx context.Context, serverID string) ([]*server.JoinRequest, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.JoinRequest), args.Error(1)
}

func TestService_Join_IdempotentAlreadyMember(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	userID := "user_123"
	memberID := "memb_123"
	roleID := "role_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)

	memberRepo.On("IsMember", mock.Anything, serverID, userID).Return(true, nil)
	memberRepo.On("FindByServerAndUser", mock.Anything, serverID, userID).Return(&server.Member{
		ID:       memberID,
		ServerID: serverID,
		UserID:   userID,
	}, nil)
	roleRepo.On("FindDefaultRole", mock.Anything, serverID).Return(&server.Role{ID: roleID}, nil)
	memberRepo.On("AssignRole", mock.Anything, memberID, roleID).Return(nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, nil, nil, nil)

	result, err := svc.Join(ctx, serverID, userID)
	require.NoError(t, err)
	assert.True(t, result.Joined)
	assert.False(t, result.Pending)

	serverRepo.AssertNotCalled(t, "IncrementMemberCount", mock.Anything, mock.Anything, mock.Anything)
	memberRepo.AssertExpectations(t)
	roleRepo.AssertExpectations(t)
}

func TestService_Join_PublicServerCreatesMemberAndIncrementsCount(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	userID := "user_123"
	roleID := "role_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)

	memberRepo.On("IsMember", mock.Anything, serverID, userID).Return(false, nil)
	serverRepo.On("FindByID", mock.Anything, serverID).Return(&server.Server{
		ID:       serverID,
		IsPublic: true,
	}, nil)
	memberRepo.On("Create", mock.Anything, mock.MatchedBy(func(m *server.Member) bool {
		return m != nil && m.ServerID == serverID && m.UserID == userID && m.ID != ""
	})).Return(nil)
	roleRepo.On("FindDefaultRole", mock.Anything, serverID).Return(&server.Role{ID: roleID}, nil)
	memberRepo.On("AssignRole", mock.Anything, mock.AnythingOfType("string"), roleID).Return(nil)
	serverRepo.On("IncrementMemberCount", mock.Anything, serverID, 1).Return(nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, nil, nil, nil)

	result, err := svc.Join(ctx, serverID, userID)
	assert.NoError(t, err)
	assert.True(t, result.Joined)
	assert.False(t, result.Pending)

	serverRepo.AssertExpectations(t)
	memberRepo.AssertExpectations(t)
	roleRepo.AssertExpectations(t)
}

func TestService_Join_PrivateServerCreatesJoinRequest(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	userID := "user_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)
	joinRequestRepo := new(mockJoinRequestRepo)

	memberRepo.On("IsMember", mock.Anything, serverID, userID).Return(false, nil)
	serverRepo.On("FindByID", mock.Anything, serverID).Return(&server.Server{
		ID:       serverID,
		IsPublic: false,
	}, nil)
	joinRequestRepo.On("Create", mock.Anything, mock.MatchedBy(func(r *server.JoinRequest) bool {
		return r != nil && r.ServerID == serverID && r.UserID == userID && r.Status == server.JoinRequestStatusPending
	})).Return(nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, joinRequestRepo, nil, nil)

	result, err := svc.Join(ctx, serverID, userID)
	require.NoError(t, err)
	assert.False(t, result.Joined)
	assert.True(t, result.Pending)

	memberRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	serverRepo.AssertNotCalled(t, "IncrementMemberCount", mock.Anything, mock.Anything, mock.Anything)
	serverRepo.AssertExpectations(t)
	memberRepo.AssertExpectations(t)
	joinRequestRepo.AssertExpectations(t)
}

func TestService_AcceptJoinRequest_OwnerAcceptsCreatesMember(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	targetUserID := "user_456"
	actorUserID := "user_owner"
	roleID := "role_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)
	joinRequestRepo := new(mockJoinRequestRepo)

	serverRepo.On("FindByID", mock.Anything, serverID).Return(&server.Server{
		ID:      serverID,
		OwnerID: actorUserID,
	}, nil)
	joinRequestRepo.On("FindByServerAndUser", mock.Anything, serverID, targetUserID).Return(&server.JoinRequest{
		ServerID: serverID,
		UserID:   targetUserID,
		Status:   server.JoinRequestStatusPending,
	}, nil)
	memberRepo.On("IsMember", mock.Anything, serverID, targetUserID).Return(false, nil)
	memberRepo.On("Create", mock.Anything, mock.MatchedBy(func(m *server.Member) bool {
		return m != nil && m.ServerID == serverID && m.UserID == targetUserID && m.ID != ""
	})).Return(nil)
	roleRepo.On("FindDefaultRole", mock.Anything, serverID).Return(&server.Role{ID: roleID}, nil)
	memberRepo.On("AssignRole", mock.Anything, mock.AnythingOfType("string"), roleID).Return(nil)
	serverRepo.On("IncrementMemberCount", mock.Anything, serverID, 1).Return(nil)
	joinRequestRepo.On("UpdateStatus", mock.Anything, serverID, targetUserID, server.JoinRequestStatusAccepted).Return(nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, joinRequestRepo, nil, nil)

	err := svc.AcceptJoinRequest(ctx, serverID, targetUserID, actorUserID)
	require.NoError(t, err)

	serverRepo.AssertExpectations(t)
	memberRepo.AssertExpectations(t)
	roleRepo.AssertExpectations(t)
	joinRequestRepo.AssertExpectations(t)
}

func TestService_Leave_IdempotentWhenNotMember(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	userID := "user_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)

	memberRepo.On("IsMember", mock.Anything, serverID, userID).Return(false, nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, nil, nil, nil)

	err := svc.Leave(ctx, serverID, userID)
	require.NoError(t, err)

	serverRepo.AssertNotCalled(t, "FindByID", mock.Anything, mock.Anything)
	memberRepo.AssertExpectations(t)
}

func TestService_Leave_OwnerCannotLeave(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	userID := "user_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)

	memberRepo.On("IsMember", mock.Anything, serverID, userID).Return(true, nil)
	serverRepo.On("FindByID", mock.Anything, serverID).Return(&server.Server{
		ID:      serverID,
		OwnerID: userID,
	}, nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, nil, nil, nil)

	err := svc.Leave(ctx, serverID, userID)
	assert.ErrorIs(t, err, server.ErrOwnerCannotLeave)

	memberRepo.AssertNotCalled(t, "Delete", mock.Anything, mock.Anything, mock.Anything)
	serverRepo.AssertExpectations(t)
	memberRepo.AssertExpectations(t)
}

func TestService_Leave_MemberDeletesAndDecrementsCount(t *testing.T) {
	ctx := context.Background()
	serverID := "serv_123"
	userID := "user_123"

	serverRepo := new(mockServerRepo)
	memberRepo := new(mockMemberRepo)
	roleRepo := new(mockRoleRepo)

	memberRepo.On("IsMember", mock.Anything, serverID, userID).Return(true, nil)
	serverRepo.On("FindByID", mock.Anything, serverID).Return(&server.Server{
		ID:      serverID,
		OwnerID: "user_owner",
	}, nil)
	memberRepo.On("Delete", mock.Anything, serverID, userID).Return(nil)
	serverRepo.On("IncrementMemberCount", mock.Anything, serverID, -1).Return(nil)

	svc := appserver.NewService(serverRepo, memberRepo, roleRepo, nil, nil, nil, nil)

	err := svc.Leave(ctx, serverID, userID)
	assert.NoError(t, err)

	serverRepo.AssertExpectations(t)
	memberRepo.AssertExpectations(t)
}
