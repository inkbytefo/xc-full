// Package testutil provides shared test utilities and mocks.
package testutil

import (
	"context"

	"github.com/stretchr/testify/mock"

	channelDomain "pink/internal/domain/channel"
	"pink/internal/domain/dm"
	"pink/internal/domain/server"
)

// =============================================================================
// Mock DM Repositories
// =============================================================================

// MockConversationRepository is a mock implementation of dm.ConversationRepository.
type MockConversationRepository struct {
	mock.Mock
}

func (m *MockConversationRepository) FindByID(ctx context.Context, id string) (*dm.Conversation, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dm.Conversation), args.Error(1)
}

func (m *MockConversationRepository) FindByUserID(ctx context.Context, userID string) ([]*dm.Conversation, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*dm.Conversation), args.Error(1)
}

func (m *MockConversationRepository) FindByParticipants(ctx context.Context, userID1, userID2 string) (*dm.Conversation, error) {
	args := m.Called(ctx, userID1, userID2)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dm.Conversation), args.Error(1)
}

func (m *MockConversationRepository) Create(ctx context.Context, conv *dm.Conversation) error {
	args := m.Called(ctx, conv)
	return args.Error(0)
}

func (m *MockConversationRepository) UpdateLastMessage(ctx context.Context, convID, messageID string) error {
	args := m.Called(ctx, convID, messageID)
	return args.Error(0)
}

func (m *MockConversationRepository) IsParticipant(ctx context.Context, convID, userID string) (bool, error) {
	args := m.Called(ctx, convID, userID)
	return args.Bool(0), args.Error(1)
}

// MockDMMessageRepository is a mock implementation of dm.MessageRepository.
type MockDMMessageRepository struct {
	mock.Mock
}

func (m *MockDMMessageRepository) FindByID(ctx context.Context, id string) (*dm.Message, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*dm.Message), args.Error(1)
}

func (m *MockDMMessageRepository) FindByConversationID(ctx context.Context, convID, cursor string, limit int) ([]*dm.Message, string, error) {
	args := m.Called(ctx, convID, cursor, limit)
	if args.Get(0) == nil {
		return nil, args.String(1), args.Error(2)
	}
	return args.Get(0).([]*dm.Message), args.String(1), args.Error(2)
}

func (m *MockDMMessageRepository) Create(ctx context.Context, message *dm.Message) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

func (m *MockDMMessageRepository) Update(ctx context.Context, message *dm.Message) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

func (m *MockDMMessageRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockDMMessageRepository) MarkAsRead(ctx context.Context, convID, userID, messageID string) error {
	args := m.Called(ctx, convID, userID, messageID)
	return args.Error(0)
}

func (m *MockDMMessageRepository) GetUnreadCount(ctx context.Context, convID, userID string) (int, error) {
	args := m.Called(ctx, convID, userID)
	return args.Int(0), args.Error(1)
}

// =============================================================================
// Mock Server Repositories
// =============================================================================

// MockServerRepository is a mock implementation of server.Repository.
type MockServerRepository struct {
	mock.Mock
}

func (m *MockServerRepository) FindByID(ctx context.Context, id string) (*server.Server, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Server), args.Error(1)
}

func (m *MockServerRepository) FindByHandle(ctx context.Context, handle string) (*server.Server, error) {
	args := m.Called(ctx, handle)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Server), args.Error(1)
}

func (m *MockServerRepository) FindByUserID(ctx context.Context, userID string) ([]*server.Server, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Server), args.Error(1)
}

func (m *MockServerRepository) Create(ctx context.Context, srv *server.Server) error {
	args := m.Called(ctx, srv)
	return args.Error(0)
}

func (m *MockServerRepository) Update(ctx context.Context, srv *server.Server) error {
	args := m.Called(ctx, srv)
	return args.Error(0)
}

func (m *MockServerRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockServerRepository) IncrementMemberCount(ctx context.Context, id string, delta int) error {
	args := m.Called(ctx, id, delta)
	return args.Error(0)
}

// MockMemberRepository is a mock implementation of server.MemberRepository.
type MockMemberRepository struct {
	mock.Mock
}

func (m *MockMemberRepository) FindByServerID(ctx context.Context, serverID string) ([]*server.Member, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Member), args.Error(1)
}

func (m *MockMemberRepository) FindByServerAndUser(ctx context.Context, serverID, userID string) (*server.Member, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Member), args.Error(1)
}

func (m *MockMemberRepository) FindByServerAndUserWithRoles(ctx context.Context, serverID, userID string) (*server.Member, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Member), args.Error(1)
}

func (m *MockMemberRepository) Create(ctx context.Context, member *server.Member) error {
	args := m.Called(ctx, member)
	return args.Error(0)
}

func (m *MockMemberRepository) Update(ctx context.Context, member *server.Member) error {
	args := m.Called(ctx, member)
	return args.Error(0)
}

func (m *MockMemberRepository) Delete(ctx context.Context, serverID, userID string) error {
	args := m.Called(ctx, serverID, userID)
	return args.Error(0)
}

func (m *MockMemberRepository) AssignRole(ctx context.Context, memberID, roleID string) error {
	args := m.Called(ctx, memberID, roleID)
	return args.Error(0)
}

func (m *MockMemberRepository) RemoveRole(ctx context.Context, memberID, roleID string) error {
	args := m.Called(ctx, memberID, roleID)
	return args.Error(0)
}

func (m *MockMemberRepository) IsMember(ctx context.Context, serverID, userID string) (bool, error) {
	args := m.Called(ctx, serverID, userID)
	return args.Bool(0), args.Error(1)
}

// MockRoleRepository is a mock implementation of server.RoleRepository.
type MockRoleRepository struct {
	mock.Mock
}

func (m *MockRoleRepository) FindByID(ctx context.Context, id string) (*server.Role, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Role), args.Error(1)
}

func (m *MockRoleRepository) FindByServerID(ctx context.Context, serverID string) ([]*server.Role, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Role), args.Error(1)
}

func (m *MockRoleRepository) FindDefaultRole(ctx context.Context, serverID string) (*server.Role, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Role), args.Error(1)
}

func (m *MockRoleRepository) FindByMemberID(ctx context.Context, memberID string) ([]*server.Role, error) {
	args := m.Called(ctx, memberID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Role), args.Error(1)
}

func (m *MockRoleRepository) Create(ctx context.Context, role *server.Role) error {
	args := m.Called(ctx, role)
	return args.Error(0)
}

func (m *MockRoleRepository) Update(ctx context.Context, role *server.Role) error {
	args := m.Called(ctx, role)
	return args.Error(0)
}

func (m *MockRoleRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRoleRepository) UpdatePositions(ctx context.Context, serverID string, positions map[string]int) error {
	args := m.Called(ctx, serverID, positions)
	return args.Error(0)
}

// MockBanRepository is a mock implementation of server.BanRepository.
type MockBanRepository struct {
	mock.Mock
}

func (m *MockBanRepository) Create(ctx context.Context, ban *server.Ban) error {
	args := m.Called(ctx, ban)
	return args.Error(0)
}

func (m *MockBanRepository) Delete(ctx context.Context, serverID, userID string) error {
	args := m.Called(ctx, serverID, userID)
	return args.Error(0)
}

func (m *MockBanRepository) Find(ctx context.Context, serverID, userID string) (*server.Ban, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.Ban), args.Error(1)
}

func (m *MockBanRepository) FindByServerID(ctx context.Context, serverID string) ([]*server.Ban, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.Ban), args.Error(1)
}

func (m *MockBanRepository) IsBanned(ctx context.Context, serverID, userID string) (bool, error) {
	args := m.Called(ctx, serverID, userID)
	return args.Bool(0), args.Error(1)
}

// MockJoinRequestRepository is a mock implementation of server.JoinRequestRepository.
type MockJoinRequestRepository struct {
	mock.Mock
}

func (m *MockJoinRequestRepository) Create(ctx context.Context, req *server.JoinRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockJoinRequestRepository) UpdateStatus(ctx context.Context, serverID, userID string, status server.JoinRequestStatus) error {
	args := m.Called(ctx, serverID, userID, status)
	return args.Error(0)
}

func (m *MockJoinRequestRepository) Delete(ctx context.Context, serverID, userID string) error {
	args := m.Called(ctx, serverID, userID)
	return args.Error(0)
}

func (m *MockJoinRequestRepository) FindByServerAndUser(ctx context.Context, serverID, userID string) (*server.JoinRequest, error) {
	args := m.Called(ctx, serverID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*server.JoinRequest), args.Error(1)
}

func (m *MockJoinRequestRepository) FindPendingByServerID(ctx context.Context, serverID string) ([]*server.JoinRequest, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.JoinRequest), args.Error(1)
}

// MockAuditLogRepository is a mock implementation of server.AuditLogRepository.
type MockAuditLogRepository struct {
	mock.Mock
}

func (m *MockAuditLogRepository) Create(ctx context.Context, log *server.AuditLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockAuditLogRepository) FindByServerID(ctx context.Context, serverID string, limit, offset int) ([]*server.AuditLog, error) {
	args := m.Called(ctx, serverID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*server.AuditLog), args.Error(1)
}

// MockChannelRepository is a mock implementation of channel.Repository.
type MockChannelRepository struct {
	mock.Mock
}

func (m *MockChannelRepository) FindByID(ctx context.Context, id string) (*channelDomain.Channel, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*channelDomain.Channel), args.Error(1)
}

func (m *MockChannelRepository) FindByServerID(ctx context.Context, serverID string) ([]*channelDomain.Channel, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*channelDomain.Channel), args.Error(1)
}

func (m *MockChannelRepository) Create(ctx context.Context, ch *channelDomain.Channel) error {
	args := m.Called(ctx, ch)
	return args.Error(0)
}

func (m *MockChannelRepository) Update(ctx context.Context, ch *channelDomain.Channel) error {
	args := m.Called(ctx, ch)
	return args.Error(0)
}

func (m *MockChannelRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockChannelRepository) UpdateLiveKitRoom(ctx context.Context, channelID, roomName string) error {
	args := m.Called(ctx, channelID, roomName)
	return args.Error(0)
}

func (m *MockChannelRepository) FindCategories(ctx context.Context, serverID string) ([]*channelDomain.Channel, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*channelDomain.Channel), args.Error(1)
}

func (m *MockChannelRepository) FindVoiceEnabled(ctx context.Context, serverID string) ([]*channelDomain.Channel, error) {
	args := m.Called(ctx, serverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*channelDomain.Channel), args.Error(1)
}

func (m *MockChannelRepository) ReorderChannels(ctx context.Context, serverID string, positions map[string]int) error {
	args := m.Called(ctx, serverID, positions)
	return args.Error(0)
}
