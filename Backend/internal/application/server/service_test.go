package server

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"pink/internal/application/testutil"
	"pink/internal/domain/server"
)

// setupServerService creates a server service with mocked dependencies.
func setupServerService(t *testing.T) (
	*Service,
	*testutil.MockServerRepository,
	*testutil.MockMemberRepository,
	*testutil.MockRoleRepository,
	*testutil.MockChannelRepository,
) {
	serverRepo := new(testutil.MockServerRepository)
	memberRepo := new(testutil.MockMemberRepository)
	roleRepo := new(testutil.MockRoleRepository)
	channelRepo := new(testutil.MockChannelRepository)
	joinRequestRepo := new(testutil.MockJoinRequestRepository)
	banRepo := new(testutil.MockBanRepository)
	auditRepo := new(testutil.MockAuditLogRepository)

	svc := NewService(serverRepo, memberRepo, roleRepo, channelRepo, joinRequestRepo, banRepo, auditRepo)
	return svc, serverRepo, memberRepo, roleRepo, channelRepo
}

// =============================================================================
// Create Tests
// =============================================================================

func TestService_Create_Success(t *testing.T) {
	svc, serverRepo, memberRepo, roleRepo, channelRepo := setupServerService(t)
	ctx := context.Background()

	// Setup mocks
	serverRepo.On("Create", ctx, mock.AnythingOfType("*server.Server")).Return(nil)
	memberRepo.On("Create", ctx, mock.AnythingOfType("*server.Member")).Return(nil)
	roleRepo.On("Create", ctx, mock.AnythingOfType("*server.Role")).Return(nil)
	memberRepo.On("AssignRole", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(nil)
	channelRepo.On("Create", ctx, mock.AnythingOfType("*channel.Channel")).Return(nil)

	result, err := svc.Create(ctx, CreateCommand{
		Name:         "Test Server",
		Description:  "A test server",
		OwnerID:      "user_owner12345678901",
		IsPublic:     true,
		IconGradient: [2]string{"#ff6b6b", "#4ecdc4"},
	})

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Server", result.Name)
	assert.Equal(t, "user_owner12345678901", result.OwnerID)
	assert.True(t, result.IsPublic)
}

// =============================================================================
// GetByID Tests
// =============================================================================

func TestService_GetByID_Success(t *testing.T) {
	svc, serverRepo, memberRepo, _, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:       "serv_12345678901234567",
		Name:     "Test Server",
		IsPublic: true,
	}

	serverRepo.On("FindByID", ctx, "serv_12345678901234567").Return(testServer, nil)
	memberRepo.On("FindByServerAndUser", ctx, "serv_12345678901234567", "user_viewer12345678").Return(&server.Member{}, nil)

	result, err := svc.GetByID(ctx, "serv_12345678901234567", "user_viewer12345678")

	require.NoError(t, err)
	assert.Equal(t, testServer.ID, result.ID)
}

func TestService_GetByID_NotFound(t *testing.T) {
	svc, serverRepo, _, _, _ := setupServerService(t)
	ctx := context.Background()

	serverRepo.On("FindByID", ctx, "nonexistent").Return(nil, server.ErrNotFound)

	result, err := svc.GetByID(ctx, "nonexistent", "user_viewer12345678")

	assert.Nil(t, result)
	assert.ErrorIs(t, err, server.ErrNotFound)
}

// =============================================================================
// Join Tests
// =============================================================================

func TestService_Join_PublicServer_Success(t *testing.T) {
	svc, serverRepo, memberRepo, roleRepo, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:       "serv_12345678901234567",
		Name:     "Public Server",
		IsPublic: true,
	}

	defaultRole := &server.Role{
		ID:        "role_everyone12345678",
		ServerID:  testServer.ID,
		IsDefault: true,
	}

	// Join first calls IsMember to check
	memberRepo.On("IsMember", ctx, testServer.ID, "user_joiner12345678").Return(false, nil)

	// Then gets server to check if public
	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)

	// Check ban
	banRepoMock := svc.banRepo.(*testutil.MockBanRepository)
	banRepoMock.On("IsBanned", ctx, testServer.ID, "user_joiner12345678").Return(false, nil)

	memberRepo.On("Create", ctx, mock.AnythingOfType("*server.Member")).Return(nil)
	roleRepo.On("FindDefaultRole", ctx, testServer.ID).Return(defaultRole, nil)
	memberRepo.On("AssignRole", ctx, mock.AnythingOfType("string"), defaultRole.ID).Return(nil)
	serverRepo.On("IncrementMemberCount", ctx, testServer.ID, 1).Return(nil)

	result, err := svc.Join(ctx, testServer.ID, "user_joiner12345678")

	require.NoError(t, err)
	assert.True(t, result.Joined)
	assert.False(t, result.Pending)
}

func TestService_Join_AlreadyMember(t *testing.T) {
	svc, _, memberRepo, roleRepo, _ := setupServerService(t)
	ctx := context.Background()

	// IsMember returns true - already a member
	memberRepo.On("IsMember", ctx, "serv_12345678901234567", "user_already123456789").Return(true, nil)

	testMember := &server.Member{
		ID:       "memb_12345678901234567",
		ServerID: "serv_12345678901234567",
		UserID:   "user_already123456789",
	}

	memberRepo.On("FindByServerAndUser", ctx, "serv_12345678901234567", "user_already123456789").Return(testMember, nil)

	defaultRole := &server.Role{
		ID:        "role_everyone12345678",
		IsDefault: true,
	}
	roleRepo.On("FindDefaultRole", ctx, "serv_12345678901234567").Return(defaultRole, nil)
	memberRepo.On("AssignRole", ctx, testMember.ID, defaultRole.ID).Return(nil)

	result, err := svc.Join(ctx, "serv_12345678901234567", "user_already123456789")

	require.NoError(t, err)
	assert.True(t, result.Joined) // Already member returns Joined: true
}

// =============================================================================
// Leave Tests
// =============================================================================

func TestService_Leave_Success(t *testing.T) {
	svc, serverRepo, memberRepo, _, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:      "serv_12345678901234567",
		Name:    "Test Server",
		OwnerID: "user_owner12345678901",
	}

	// Leave first calls IsMember
	memberRepo.On("IsMember", ctx, testServer.ID, "user_member1234567890").Return(true, nil)
	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)
	memberRepo.On("Delete", ctx, testServer.ID, "user_member1234567890").Return(nil)
	serverRepo.On("IncrementMemberCount", ctx, testServer.ID, -1).Return(nil)

	err := svc.Leave(ctx, testServer.ID, "user_member1234567890")

	assert.NoError(t, err)
}

func TestService_Leave_OwnerCannotLeave(t *testing.T) {
	svc, serverRepo, memberRepo, _, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:      "serv_12345678901234567",
		Name:    "Test Server",
		OwnerID: "user_owner12345678901",
	}

	// Leave first calls IsMember
	memberRepo.On("IsMember", ctx, testServer.ID, "user_owner12345678901").Return(true, nil)
	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)

	err := svc.Leave(ctx, testServer.ID, "user_owner12345678901")

	assert.ErrorIs(t, err, server.ErrOwnerCannotLeave)
}

// =============================================================================
// Delete Tests
// =============================================================================

func TestService_Delete_Success(t *testing.T) {
	svc, serverRepo, _, _, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:      "serv_12345678901234567",
		Name:    "Test Server",
		OwnerID: "user_owner12345678901",
	}

	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)
	serverRepo.On("Delete", ctx, testServer.ID).Return(nil)

	err := svc.Delete(ctx, testServer.ID, "user_owner12345678901")

	assert.NoError(t, err)
}

func TestService_Delete_NotOwner(t *testing.T) {
	svc, serverRepo, _, _, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:      "serv_12345678901234567",
		Name:    "Test Server",
		OwnerID: "user_owner12345678901",
	}

	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)

	err := svc.Delete(ctx, testServer.ID, "user_notowner123456789")

	assert.ErrorIs(t, err, server.ErrNoPermission)
}

// =============================================================================
// ListRoles Tests
// =============================================================================

func TestService_ListRoles_Success(t *testing.T) {
	svc, _, memberRepo, roleRepo, _ := setupServerService(t)
	ctx := context.Background()

	roles := []*server.Role{
		{ID: "role_1", Name: "@everyone", IsDefault: true},
		{ID: "role_2", Name: "Admin"},
	}

	// ListRoles first calls IsMember
	memberRepo.On("IsMember", ctx, "serv_12345678901234567", "user_member1234567890").Return(true, nil)
	roleRepo.On("FindByServerID", ctx, "serv_12345678901234567").Return(roles, nil)

	result, err := svc.ListRoles(ctx, "serv_12345678901234567", "user_member1234567890")

	require.NoError(t, err)
	assert.Len(t, result, 2)
}

// =============================================================================
// IsOwner Tests
// =============================================================================

func TestService_IsOwner(t *testing.T) {
	svc, serverRepo, _, _, _ := setupServerService(t)
	ctx := context.Background()

	testServer := &server.Server{
		ID:      "serv_12345678901234567",
		Name:    "Test Server",
		OwnerID: "user_owner12345678901",
	}

	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)

	isOwner := svc.IsOwner(ctx, testServer.ID, "user_owner12345678901")
	assert.True(t, isOwner)

	// Reset mock for second call
	serverRepo.ExpectedCalls = nil
	serverRepo.On("FindByID", ctx, testServer.ID).Return(testServer, nil)

	notOwner := svc.IsOwner(ctx, testServer.ID, "user_notowner123456789")
	assert.False(t, notOwner)
}
