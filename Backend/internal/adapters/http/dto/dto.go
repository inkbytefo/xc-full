// Package dto provides data transfer objects for HTTP API.
package dto

import (
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

// Validate validates a struct.
func Validate(s interface{}) error {
	return validate.Struct(s)
}

// === Auth DTOs ===

// RegisterRequest represents a registration request.
type RegisterRequest struct {
	Handle      string `json:"handle" validate:"required,min=3,max=20,alphanum"`
	DisplayName string `json:"displayName" validate:"required,min=1,max=50"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8,max=128"`
}

// LoginRequest represents a login request.
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RefreshRequest represents a token refresh request.
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// LogoutRequest represents a logout request.
type LogoutRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// AuthResponse represents an authentication response.
type AuthResponse struct {
	User   UserResponse   `json:"user"`
	Tokens TokensResponse `json:"tokens"`
}

// TokensResponse represents tokens in a response.
type TokensResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

// RefreshResponse represents a token refresh response.
type RefreshResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

// === User DTOs ===

// UserResponse represents a user in API responses.
type UserResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	Email          string    `json:"email,omitempty"`
	AvatarGradient [2]string `json:"avatarGradient"`
	AvatarURL      string    `json:"avatarUrl,omitempty"`
	BannerURL      string    `json:"bannerUrl,omitempty"`
	Bio            string    `json:"bio,omitempty"`
	IsVerified     bool      `json:"isVerified"`
	CreatedAt      string    `json:"createdAt,omitempty"`
}

// PublicUserResponse represents a public user (no email).
type PublicUserResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
}

// MeResponse represents the /me endpoint response.
type MeResponse struct {
	User UserResponse `json:"user"`
}

// UserProfileResponse represents a full user profile with stats.
type UserProfileResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
	Bio            string    `json:"bio,omitempty"`
	IsVerified     bool      `json:"isVerified"`
	FollowersCount int64     `json:"followersCount"`
	FollowingCount int64     `json:"followingCount"`
	PostsCount     int64     `json:"postsCount"`
	IsFollowing    bool      `json:"isFollowing"`
	IsFollowedBy   bool      `json:"isFollowedBy"`
	CreatedAt      string    `json:"createdAt"`
}

// UpdateProfileRequest represents a profile update request.
type UpdateProfileRequest struct {
	DisplayName    *string    `json:"displayName,omitempty" validate:"omitempty,min=1,max=50"`
	Bio            *string    `json:"bio,omitempty" validate:"omitempty,max=160"`
	AvatarGradient *[2]string `json:"avatarGradient,omitempty"`
	AvatarURL      *string    `json:"avatarUrl,omitempty" validate:"omitempty,url,max=500"`
	BannerURL      *string    `json:"bannerUrl,omitempty" validate:"omitempty,url,max=500"`
}

// === Server Wall DTOs ===

// ServerWallPostResponse represents a server wall post.
type ServerWallPostResponse struct {
	ID        string `json:"id"`
	ServerID  string `json:"serverId"`
	AuthorID  string `json:"authorId"`
	Content   string `json:"content"`
	IsPinned  bool   `json:"isPinned"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// CreateWallPostRequest represents a request to create a wall post.
type CreateWallPostRequest struct {
	Content string `json:"content" validate:"required,min=1,max=2000"`
}

// === Error DTOs ===

// ErrorResponse represents an error response.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail contains error details.
type ErrorDetail struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// NewErrorResponse creates a new error response.
func NewErrorResponse(code, message string) ErrorResponse {
	return ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	}
}

// NewValidationErrorResponse creates a validation error response.
func NewValidationErrorResponse(details map[string]string) ErrorResponse {
	return ErrorResponse{
		Error: ErrorDetail{
			Code:    "VALIDATION_ERROR",
			Message: "Validation failed",
			Details: details,
		},
	}
}

// === Server DTOs ===

// CreateServerRequest represents a server creation request.
type CreateServerRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=100"`
	Description string `json:"description" validate:"max=500"`
	IsPublic    bool   `json:"isPublic"`
	Accent      string `json:"accent"` // Primary color for icon gradient
}

// UpdateServerRequest represents a server update request.
type UpdateServerRequest struct {
	Name        string `json:"name" validate:"min=2,max=100"`
	Description string `json:"description" validate:"max=500"`
	IsPublic    bool   `json:"isPublic"`
}

// ServerResponse represents a server in API responses.
type ServerResponse struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description,omitempty"`
	IconGradient [2]string `json:"iconGradient"`
	MemberCount  int       `json:"memberCount"`
	OwnerID      string    `json:"ownerId"`
	IsPublic     bool      `json:"isPublic"`
	MyRole       string    `json:"myRole,omitempty"`
	CreatedAt    string    `json:"createdAt,omitempty"`
}

// MemberResponse represents a server member in API responses.
type MemberResponse struct {
	ID       string `json:"id"`
	UserID   string `json:"userId"`
	Role     string `json:"role"`
	JoinedAt string `json:"joinedAt"`
}

// MemberWithUserResponse represents a member with user details.
type MemberWithUserResponse struct {
	ID       string              `json:"id"`
	UserID   string              `json:"userId"`
	Role     string              `json:"role"`
	JoinedAt string              `json:"joinedAt"`
	User     *PublicUserResponse `json:"user,omitempty"`
	RoleIDs  []string            `json:"roleIds,omitempty"`
}

// UpdateMemberRoleRequest represents a role update request.
type UpdateMemberRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=admin moderator member"`
}

// RoleResponse represents a server role in API responses.
type RoleResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Position    int    `json:"position"`
	Permissions int64  `json:"permissions"`
	IsDefault   bool   `json:"isDefault"`
}

// BanResponse represents a server ban.
type BanResponse struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	BannedBy  string `json:"bannedBy"`
	Reason    string `json:"reason"`
	CreatedAt string `json:"createdAt"`
}

type JoinRequestResponse struct {
	ServerID  string `json:"serverId"`
	UserID    string `json:"userId"`
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// === Channel DTOs ===

// CreateChannelRequest represents a channel creation request.
type CreateChannelRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=100"`
	Description string  `json:"description" validate:"max=500"`
	Type        string  `json:"type" validate:"omitempty,oneof=text voice announcement category video stage hybrid"`
	ParentID    *string `json:"parentId,omitempty"`
}

// UpdateChannelRequest represents a channel update request.
type UpdateChannelRequest struct {
	Name        string  `json:"name" validate:"min=1,max=100"`
	Description string  `json:"description" validate:"max=500"`
	Position    *int    `json:"position,omitempty"`
	ParentID    *string `json:"parentId,omitempty"` // Category ID for hierarchy
}

// ChannelPositionUpdate represents a single channel position update for bulk reordering.
type ChannelPositionUpdate struct {
	ID       string  `json:"id" validate:"required"`
	Position int     `json:"position"`
	ParentID *string `json:"parentId,omitempty"`
}

// ReorderChannelsRequest represents a bulk channel reorder request.
type ReorderChannelsRequest struct {
	Updates []ChannelPositionUpdate `json:"updates" validate:"required,min=1"`
}

// ChannelResponse represents a channel in API responses.
type ChannelResponse struct {
	ID          string  `json:"id"`
	ServerID    string  `json:"serverId"`
	Name        string  `json:"name"`
	Description string  `json:"description,omitempty"`
	Type        string  `json:"type"`
	Position    int     `json:"position"`
	ParentID    *string `json:"parentId,omitempty"`
	IsPrivate   bool    `json:"isPrivate"`
	CreatedAt   string  `json:"createdAt,omitempty"`
}

// === Feed DTOs ===

// CreatePostRequest represents a post creation request.
type CreatePostRequest struct {
	Content    string   `json:"content" validate:"required,min=1,max=1000"`
	Visibility string   `json:"visibility" validate:"omitempty,oneof=public friends server"`
	ServerID   *string  `json:"serverId,omitempty"`
	ReplyToID  *string  `json:"replyToId,omitempty"`
	MediaURLs  []string `json:"mediaUrls,omitempty" validate:"max=4"`
}

// PostResponse represents a post in API responses.
type PostResponse struct {
	ID           string              `json:"id"`
	AuthorID     string              `json:"authorId"`
	Content      string              `json:"content"`
	Visibility   string              `json:"visibility"`
	ServerID     *string             `json:"serverId,omitempty"`
	ReplyToID    *string             `json:"replyToId,omitempty"`
	RepostOfID   *string             `json:"repostOfId,omitempty"`
	MediaURLs    []string            `json:"mediaUrls,omitempty"`
	LikeCount    int                 `json:"likeCount"`
	RepostCount  int                 `json:"repostCount"`
	ReplyCount   int                 `json:"replyCount"`
	IsLiked      bool                `json:"isLiked"`
	IsReposted   bool                `json:"isReposted"`
	IsBookmarked bool                `json:"isBookmarked"`
	Author       *PostAuthorResponse `json:"author,omitempty"`
	CreatedAt    string              `json:"createdAt"`
}

// PostAuthorResponse represents the author info in a post response.
type PostAuthorResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
	IsVerified     bool      `json:"isVerified"`
}

// === DM DTOs ===

// StartConversationRequest represents a request to start a conversation.
type StartConversationRequest struct {
	UserID string `json:"userId" validate:"required"`
}

// SendMessageRequest represents a request to send a message.
type SendMessageRequest struct {
	Content string `json:"content" validate:"required,min=1,max=2000"`
}

// EditMessageRequest represents a request to edit a message.
type EditMessageRequest struct {
	Content string `json:"content" validate:"required,min=1,max=2000"`
}

// ConversationResponse represents a conversation in API responses.
type ConversationResponse struct {
	ID          string                    `json:"id"`
	OtherUser   *ConversationUserResponse `json:"otherUser,omitempty"`
	LastMessage *LastMessageResponse      `json:"lastMessage,omitempty"`
	UnreadCount int                       `json:"unreadCount"`
	CreatedAt   string                    `json:"createdAt"`
	UpdatedAt   string                    `json:"updatedAt"`
}

// ConversationUserResponse represents a user in a conversation.
type ConversationUserResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
	IsOnline       bool      `json:"isOnline"`
}

// LastMessageResponse represents the last message in a conversation.
type LastMessageResponse struct {
	ID       string `json:"id"`
	Content  string `json:"content"`
	SenderID string `json:"senderId"`
}

// DMMessageResponse represents a DM message in API responses.
type DMMessageResponse struct {
	ID             string                    `json:"id"`
	ConversationID string                    `json:"conversationId"`
	SenderID       string                    `json:"senderId"`
	Content        string                    `json:"content"`
	IsEdited       bool                      `json:"isEdited"`
	Sender         *ConversationUserResponse `json:"sender,omitempty"`
	CreatedAt      string                    `json:"createdAt"`
}

// === Channel Message DTOs ===

// SendChannelMessageRequest represents a request to send a channel message.
type SendChannelMessageRequest struct {
	Content   string  `json:"content" validate:"required,min=1,max=2000"`
	ReplyToID *string `json:"replyToId,omitempty"`
}

// EditChannelMessageRequest represents a request to edit a channel message.
type EditChannelMessageRequest struct {
	Content string `json:"content" validate:"required,min=1,max=2000"`
}

// ChannelMessageResponse represents a channel message in API responses.
type ChannelMessageResponse struct {
	ID        string                        `json:"id"`
	ChannelID string                        `json:"channelId"`
	ServerID  string                        `json:"serverId"`
	AuthorID  string                        `json:"authorId"`
	Content   string                        `json:"content"`
	IsEdited  bool                          `json:"isEdited"`
	IsPinned  bool                          `json:"isPinned"`
	ReplyToID *string                       `json:"replyToId,omitempty"`
	Author    *ChannelMessageAuthorResponse `json:"author,omitempty"`
	CreatedAt string                        `json:"createdAt"`
}

// ChannelMessageAuthorResponse represents the author info in a channel message.
type ChannelMessageAuthorResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
}

// === Live Streaming DTOs ===

// StartStreamRequest represents a request to start a stream.
type StartStreamRequest struct {
	Title       string  `json:"title" validate:"required,min=3,max=100"`
	Description string  `json:"description"`
	CategoryID  *string `json:"categoryId,omitempty"`
	IsNSFW      bool    `json:"isNsfw"`
}

// UpdateStreamRequest represents a request to update a stream.
type UpdateStreamRequest struct {
	Title       string  `json:"title" validate:"omitempty,min=3,max=100"`
	Description *string `json:"description,omitempty"`
	CategoryID  *string `json:"categoryId,omitempty"`
	IsNSFW      *bool   `json:"isNsfw,omitempty"`
}

// StreamResponse represents a stream in API responses.
type StreamResponse struct {
	ID          string            `json:"id"`
	UserID      string            `json:"userId"`
	Title       string            `json:"title"`
	Description string            `json:"description,omitempty"`
	CategoryID  *string           `json:"categoryId,omitempty"`
	Status      string            `json:"status"`
	ViewerCount int               `json:"viewerCount"`
	IsNSFW      bool              `json:"isNsfw"`
	StartedAt   *string           `json:"startedAt,omitempty"`
	CreatedAt   string            `json:"createdAt"`
	Streamer    *StreamerResponse `json:"streamer,omitempty"`
	Category    *CategoryResponse `json:"category,omitempty"`
}

// StreamerResponse represents streamer info in a stream response.
type StreamerResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
	IsVerified     bool      `json:"isVerified"`
}

// CategoryResponse represents a category in API responses.
type CategoryResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description string  `json:"description,omitempty"`
	IconURL     *string `json:"iconUrl,omitempty"`
	StreamCount int     `json:"streamCount,omitempty"`
}

// === Notification DTOs ===

// NotificationResponse represents a notification in API responses.
type NotificationResponse struct {
	ID         string                     `json:"id"`
	Type       string                     `json:"type"`
	TargetType *string                    `json:"targetType,omitempty"`
	TargetID   *string                    `json:"targetId,omitempty"`
	Message    string                     `json:"message"`
	IsRead     bool                       `json:"isRead"`
	CreatedAt  string                     `json:"createdAt"`
	Actor      *NotificationActorResponse `json:"actor,omitempty"`
}

// NotificationActorResponse represents the actor in a notification.
type NotificationActorResponse struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
}

// === Search DTOs ===

// SearchUserResult represents a user in search results.
type SearchUserResult struct {
	ID             string    `json:"id"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"displayName"`
	AvatarGradient [2]string `json:"avatarGradient"`
	IsVerified     bool      `json:"isVerified"`
}

// SearchServerResult represents a server in search results.
type SearchServerResult struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description,omitempty"`
	IconGradient [2]string `json:"iconGradient"`
	MemberCount  int       `json:"memberCount"`
}

// SearchPostResult represents a post in search results.
type SearchPostResult struct {
	ID                   string    `json:"id"`
	AuthorID             string    `json:"authorId"`
	Content              string    `json:"content"`
	LikeCount            int       `json:"likeCount"`
	CreatedAt            string    `json:"createdAt"`
	AuthorHandle         string    `json:"authorHandle"`
	AuthorDisplayName    string    `json:"authorDisplayName"`
	AuthorAvatarGradient [2]string `json:"authorAvatarGradient"`
}

// === Voice Channel DTOs ===

// CreateVoiceChannelRequest represents a request to create a voice channel.
type CreateVoiceChannelRequest struct {
	Name      string  `json:"name" validate:"required,min=1,max=100"`
	Type      string  `json:"type"` // voice, video, stage
	Position  int     `json:"position"`
	UserLimit int     `json:"userLimit"` // 0 = unlimited
	ParentID  *string `json:"parentId,omitempty"`
}

// VoiceChannelResponse represents a voice channel in API responses.
type VoiceChannelResponse struct {
	ID               string `json:"id"`
	ServerID         string `json:"serverId"`
	Name             string `json:"name"`
	Type             string `json:"type"`
	Position         int    `json:"position"`
	UserLimit        int    `json:"userLimit"`
	ParticipantCount int    `json:"participantCount"`
	CreatedAt        string `json:"createdAt"`
}

// === Media DTOs ===

// MediaResponse represents a media file in API responses.
type MediaResponse struct {
	ID           string `json:"id"`
	Filename     string `json:"filename"`
	OriginalName string `json:"originalName"`
	MimeType     string `json:"mimeType"`
	Type         string `json:"type"`
	Size         int64  `json:"size"`
	URL          string `json:"url"`
	CreatedAt    string `json:"createdAt"`
}

// === Privacy DTOs ===

// PrivacySettingsResponse represents user privacy settings in API responses.
type PrivacySettingsResponse struct {
	OnlineStatusVisibility  string `json:"onlineStatusVisibility"`
	DMPermission            string `json:"dmPermission"`
	ProfileVisibility       string `json:"profileVisibility"`
	ShowActivity            bool   `json:"showActivity"`
	ReadReceiptsEnabled     bool   `json:"readReceiptsEnabled"`
	TypingIndicatorsEnabled bool   `json:"typingIndicatorsEnabled"`
	FriendRequestPermission string `json:"friendRequestPermission"`
}

// UpdatePrivacyRequest represents a privacy settings update request.
type UpdatePrivacyRequest struct {
	OnlineStatusVisibility  *string `json:"onlineStatusVisibility,omitempty"`
	DMPermission            *string `json:"dmPermission,omitempty"`
	ProfileVisibility       *string `json:"profileVisibility,omitempty"`
	ShowActivity            *bool   `json:"showActivity,omitempty"`
	ReadReceiptsEnabled     *bool   `json:"readReceiptsEnabled,omitempty"`
	TypingIndicatorsEnabled *bool   `json:"typingIndicatorsEnabled,omitempty"`
	FriendRequestPermission *string `json:"friendRequestPermission,omitempty"`
}
