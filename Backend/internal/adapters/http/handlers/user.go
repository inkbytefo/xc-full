package handlers

import (
	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/application/user"
)

// UserHandler handles user-related requests.
type UserHandler struct {
	userService *user.Service
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(userService *user.Service) *UserHandler {
	return &UserHandler{userService: userService}
}

// GetMe returns the current authenticated user.
// GET /me
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	u, err := h.userService.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"USER_NOT_FOUND",
			"User not found",
		))
	}

	return c.JSON(fiber.Map{
		"data": dto.MeResponse{
			User: dto.UserResponse{
				ID:             u.ID,
				Handle:         u.Handle,
				DisplayName:    u.DisplayName,
				Email:          u.Email,
				AvatarGradient: u.AvatarGradient,
				Bio:            u.Bio,
				IsVerified:     u.IsVerified,
				CreatedAt:      u.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			},
		},
	})
}

// GetUser returns a public user profile by ID.
// GET /users/:id
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	targetUserID := c.Params("id")
	if targetUserID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_USER_ID",
			"User ID is required",
		))
	}

	currentUserID, _ := c.Locals("userID").(string)

	u, err := h.userService.GetByID(c.Context(), targetUserID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"USER_NOT_FOUND",
			"User not found",
		))
	}

	// Get follower/following counts and relationship
	profile, err := h.userService.GetProfile(c.Context(), targetUserID, currentUserID)
	if err != nil {
		// Fallback to basic info
		return c.JSON(fiber.Map{
			"data": dto.UserProfileResponse{
				ID:             u.ID,
				Handle:         u.Handle,
				DisplayName:    u.DisplayName,
				AvatarGradient: u.AvatarGradient,
				Bio:            u.Bio,
				IsVerified:     u.IsVerified,
				FollowersCount: 0,
				FollowingCount: 0,
				PostsCount:     0,
				IsFollowing:    false,
				IsFollowedBy:   false,
				CreatedAt:      u.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			},
		})
	}

	return c.JSON(fiber.Map{
		"data": dto.UserProfileResponse{
			ID:             profile.ID,
			Handle:         profile.Handle,
			DisplayName:    profile.DisplayName,
			AvatarGradient: profile.AvatarGradient,
			Bio:            profile.Bio,
			IsVerified:     profile.IsVerified,
			FollowersCount: profile.FollowersCount,
			FollowingCount: profile.FollowingCount,
			PostsCount:     profile.PostsCount,
			IsFollowing:    profile.IsFollowing,
			IsFollowedBy:   profile.IsFollowedBy,
			CreatedAt:      profile.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		},
	})
}

// GetUserByHandle returns a public user profile by handle.
// GET /users/handle/:handle
func (h *UserHandler) GetUserByHandle(c *fiber.Ctx) error {
	handle := c.Params("handle")
	if handle == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_HANDLE",
			"Handle is required",
		))
	}

	currentUserID, _ := c.Locals("userID").(string)

	profile, err := h.userService.GetProfileByHandle(c.Context(), handle, currentUserID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"USER_NOT_FOUND",
			"User not found",
		))
	}

	return c.JSON(fiber.Map{
		"data": dto.UserProfileResponse{
			ID:             profile.ID,
			Handle:         profile.Handle,
			DisplayName:    profile.DisplayName,
			AvatarGradient: profile.AvatarGradient,
			Bio:            profile.Bio,
			IsVerified:     profile.IsVerified,
			FollowersCount: profile.FollowersCount,
			FollowingCount: profile.FollowingCount,
			PostsCount:     profile.PostsCount,
			IsFollowing:    profile.IsFollowing,
			IsFollowedBy:   profile.IsFollowedBy,
			CreatedAt:      profile.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		},
	})
}

// UpdateMe updates the current user's profile.
// PATCH /me
func (h *UserHandler) UpdateMe(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	var req dto.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_REQUEST",
			"Invalid request body",
		))
	}

	if err := dto.Validate(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"VALIDATION_ERROR",
			err.Error(),
		))
	}

	u, err := h.userService.UpdateProfile(c.Context(), userID, user.UpdateProfileCommand{
		DisplayName:    req.DisplayName,
		Bio:            req.Bio,
		AvatarGradient: req.AvatarGradient,
		AvatarURL:      req.AvatarURL,
		BannerURL:      req.BannerURL,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"UPDATE_FAILED",
			"Failed to update profile",
		))
	}

	return c.JSON(fiber.Map{
		"data": dto.UserResponse{
			ID:             u.ID,
			Handle:         u.Handle,
			DisplayName:    u.DisplayName,
			Email:          u.Email,
			AvatarGradient: u.AvatarGradient,
			AvatarURL:      u.AvatarURL,
			BannerURL:      u.BannerURL,
			Bio:            u.Bio,
			IsVerified:     u.IsVerified,
			CreatedAt:      u.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		},
	})
}

// Follow follows a user.
// POST /users/:id/follow
func (h *UserHandler) Follow(c *fiber.Ctx) error {
	followerID, ok := c.Locals("userID").(string)
	if !ok || followerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	followedID := c.Params("id")
	if followedID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_USER_ID",
			"User ID is required",
		))
	}

	if followerID == followedID {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"CANNOT_FOLLOW_SELF",
			"You cannot follow yourself",
		))
	}

	result, err := h.userService.Follow(c.Context(), followerID, followedID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"FOLLOW_FAILED",
			err.Error(),
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"following": result.Status == "active",
			"pending":   result.Pending,
			"status":    result.Status,
		},
	})
}

// Unfollow unfollows a user.
// DELETE /users/:id/follow
func (h *UserHandler) Unfollow(c *fiber.Ctx) error {
	followerID, ok := c.Locals("userID").(string)
	if !ok || followerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	followedID := c.Params("id")
	if followedID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_USER_ID",
			"User ID is required",
		))
	}

	if err := h.userService.Unfollow(c.Context(), followerID, followedID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"UNFOLLOW_FAILED",
			err.Error(),
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"following": false,
		},
	})
}

// GetFollowers returns a user's followers.
// GET /users/:id/followers
func (h *UserHandler) GetFollowers(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_USER_ID",
			"User ID is required",
		))
	}

	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)
	if limit > 100 {
		limit = 100
	}

	followers, nextCursor, err := h.userService.GetFollowers(c.Context(), userID, cursor, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"FETCH_FAILED",
			"Failed to fetch followers",
		))
	}

	result := make([]dto.PublicUserResponse, len(followers))
	for i, f := range followers {
		result[i] = dto.PublicUserResponse{
			ID:             f.ID,
			Handle:         f.Handle,
			DisplayName:    f.DisplayName,
			AvatarGradient: f.AvatarGradient,
		}
	}

	response := fiber.Map{
		"data": result,
	}
	if nextCursor != "" {
		response["nextCursor"] = nextCursor
	}

	return c.JSON(response)
}

// GetFollowing returns users that a user is following.
// GET /users/:id/following
func (h *UserHandler) GetFollowing(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_USER_ID",
			"User ID is required",
		))
	}

	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)
	if limit > 100 {
		limit = 100
	}

	following, nextCursor, err := h.userService.GetFollowing(c.Context(), userID, cursor, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"FETCH_FAILED",
			"Failed to fetch following",
		))
	}

	result := make([]dto.PublicUserResponse, len(following))
	for i, f := range following {
		result[i] = dto.PublicUserResponse{
			ID:             f.ID,
			Handle:         f.Handle,
			DisplayName:    f.DisplayName,
			AvatarGradient: f.AvatarGradient,
		}
	}

	response := fiber.Map{
		"data": result,
	}
	if nextCursor != "" {
		response["nextCursor"] = nextCursor
	}

	return c.JSON(response)
}

// GetPendingRequests returns pending follow requests for the current user.
// GET /me/follow-requests
func (h *UserHandler) GetPendingRequests(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)
	if limit > 100 {
		limit = 100
	}

	users, nextCursor, err := h.userService.GetPendingRequests(c.Context(), userID, cursor, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"FETCH_FAILED",
			"Failed to fetch follow requests",
		))
	}

	result := make([]dto.PublicUserResponse, len(users))
	for i, u := range users {
		result[i] = dto.PublicUserResponse{
			ID:             u.ID,
			Handle:         u.Handle,
			DisplayName:    u.DisplayName,
			AvatarGradient: u.AvatarGradient,
		}
	}

	response := fiber.Map{
		"data": result,
	}
	if nextCursor != "" {
		response["nextCursor"] = nextCursor
	}

	return c.JSON(response)
}

// AcceptFollowRequest accepts a pending follow request.
// POST /me/follow-requests/:requesterId/accept
func (h *UserHandler) AcceptFollowRequest(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	requesterID := c.Params("requesterId")
	if requesterID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_REQUEST",
			"Requester ID is required",
		))
	}

	if err := h.userService.AcceptFollowRequest(c.Context(), userID, requesterID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"ACCEPT_FAILED",
			err.Error(),
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"accepted": true,
		},
	})
}

// RejectFollowRequest rejects a pending follow request.
// POST /me/follow-requests/:requesterId/reject
func (h *UserHandler) RejectFollowRequest(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	requesterID := c.Params("requesterId")
	if requesterID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_REQUEST",
			"Requester ID is required",
		))
	}

	if err := h.userService.RejectFollowRequest(c.Context(), userID, requesterID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"REJECT_FAILED",
			err.Error(),
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"rejected": true,
		},
	})
}

// BlockUser blocks a user.
// POST /users/:id/block
func (h *UserHandler) BlockUser(c *fiber.Ctx) error {
	blockerID, ok := c.Locals("userID").(string)
	if !ok || blockerID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	blockedID := c.Params("id")
	if blockedID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_USER_ID",
			"User ID is required",
		))
	}

	if blockerID == blockedID {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"CANNOT_BLOCK_SELF",
			"You cannot block yourself",
		))
	}

	if err := h.userService.BlockUser(c.Context(), blockerID, blockedID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"BLOCK_FAILED",
			err.Error(),
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"blocked": true,
		},
	})
}
