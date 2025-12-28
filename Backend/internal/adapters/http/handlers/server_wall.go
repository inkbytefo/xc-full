package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"pink/internal/adapters/http/dto"
	"pink/internal/domain/server"
)

// ServerWallHandler handles server wall post requests.
type ServerWallHandler struct {
	wallPostRepo server.WallPostRepository
	memberRepo   server.MemberRepository
	serverRepo   server.Repository
}

// NewServerWallHandler creates a new ServerWallHandler.
func NewServerWallHandler(
	wallPostRepo server.WallPostRepository,
	memberRepo server.MemberRepository,
	serverRepo server.Repository,
) *ServerWallHandler {
	return &ServerWallHandler{
		wallPostRepo: wallPostRepo,
		memberRepo:   memberRepo,
		serverRepo:   serverRepo,
	}
}

// GetWallPosts returns wall posts for a server.
// GET /servers/:id/wall
func (h *ServerWallHandler) GetWallPosts(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	serverID := c.Params("id")
	if serverID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_SERVER_ID",
			"Server ID is required",
		))
	}

	srv, err := h.serverRepo.FindByID(c.Context(), serverID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"SERVER_NOT_FOUND",
			"Server not found",
		))
	}

	if !srv.IsPublic {
		isMember, err := h.memberRepo.IsMember(c.Context(), serverID, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
				"FETCH_FAILED",
				"Failed to fetch wall posts",
			))
		}
		if !isMember {
			return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
				"SERVER_NOT_FOUND",
				"Server not found",
			))
		}
	}

	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)
	if limit > 100 {
		limit = 100
	}

	posts, nextCursor, err := h.wallPostRepo.FindByServer(c.Context(), serverID, cursor, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"FETCH_FAILED",
			"Failed to fetch wall posts",
		))
	}

	result := make([]dto.ServerWallPostResponse, len(posts))
	for i, post := range posts {
		result[i] = dto.ServerWallPostResponse{
			ID:        post.ID,
			ServerID:  post.ServerID,
			AuthorID:  post.AuthorID,
			Content:   post.Content,
			IsPinned:  post.IsPinned,
			CreatedAt: post.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			UpdatedAt: post.UpdatedAt.Format("2006-01-02T15:04:05.000Z"),
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

// CreateWallPost creates a new wall post.
// POST /servers/:id/wall
func (h *ServerWallHandler) CreateWallPost(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	serverID := c.Params("id")
	if serverID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_SERVER_ID",
			"Server ID is required",
		))
	}

	if !h.canPostToWall(c, serverID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"NOT_AUTHORIZED",
			"Only owners, admins and moderators can create wall posts",
		))
	}

	var req dto.CreateWallPostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_REQUEST",
			"Invalid request body",
		))
	}

	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"CONTENT_REQUIRED",
			"Content is required",
		))
	}

	post := &server.WallPost{
		ID:        generateWallPostID(),
		ServerID:  serverID,
		AuthorID:  userID,
		Content:   req.Content,
		IsPinned:  false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.wallPostRepo.Create(c.Context(), post); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"CREATE_FAILED",
			"Failed to create wall post",
		))
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": dto.ServerWallPostResponse{
			ID:        post.ID,
			ServerID:  post.ServerID,
			AuthorID:  post.AuthorID,
			Content:   post.Content,
			IsPinned:  post.IsPinned,
			CreatedAt: post.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			UpdatedAt: post.UpdatedAt.Format("2006-01-02T15:04:05.000Z"),
		},
	})
}

// DeleteWallPost deletes a wall post.
// DELETE /servers/:id/wall/:postId
func (h *ServerWallHandler) DeleteWallPost(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	serverID := c.Params("id")
	postID := c.Params("postId")
	if postID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_POST_ID",
			"Post ID is required",
		))
	}

	// Get post to verify ownership
	post, err := h.wallPostRepo.FindByID(c.Context(), postID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"POST_NOT_FOUND",
			"Wall post not found",
		))
	}

	// Check if user is author or has manage permission
	if post.AuthorID != userID {
		if !h.canManageWall(c, serverID, userID) {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"NOT_AUTHORIZED",
				"You are not authorized to delete this post",
			))
		}
	}

	if err := h.wallPostRepo.Delete(c.Context(), postID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"DELETE_FAILED",
			"Failed to delete wall post",
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"deleted": true,
		},
	})
}

// PinWallPost pins a wall post.
// POST /servers/:id/wall/:postId/pin
func (h *ServerWallHandler) PinWallPost(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	serverID := c.Params("id")
	postID := c.Params("postId")
	if postID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_POST_ID",
			"Post ID is required",
		))
	}

	// Check if user has permission to pin
	if !h.canManageWall(c, serverID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"NOT_AUTHORIZED",
			"Only owners, admins and moderators can pin posts",
		))
	}

	if err := h.wallPostRepo.Pin(c.Context(), postID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"PIN_FAILED",
			"Failed to pin wall post",
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"pinned": true,
		},
	})
}

// UnpinWallPost unpins a wall post.
// DELETE /servers/:id/wall/:postId/pin
func (h *ServerWallHandler) UnpinWallPost(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Authentication required",
		))
	}

	serverID := c.Params("id")
	postID := c.Params("postId")
	if postID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_POST_ID",
			"Post ID is required",
		))
	}

	// Check if user has permission to unpin
	if !h.canManageWall(c, serverID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"NOT_AUTHORIZED",
			"Only owners, admins and moderators can unpin posts",
		))
	}

	if err := h.wallPostRepo.Unpin(c.Context(), postID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"UNPIN_FAILED",
			"Failed to unpin wall post",
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"pinned": false,
		},
	})
}

// canManageWall checks if user can manage wall posts (pin/unpin, delete others')
func (h *ServerWallHandler) canManageWall(c *fiber.Ctx, serverID, userID string) bool {
	// Check if owner
	srv, err := h.serverRepo.FindByID(c.Context(), serverID)
	if err == nil && srv.OwnerID == userID {
		return true
	}

	// Check role permissions
	member, err := h.memberRepo.FindByServerAndUserWithRoles(c.Context(), serverID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionKickMembers) || member.HasPermission(server.PermissionManageServer)
}

func (h *ServerWallHandler) canPostToWall(c *fiber.Ctx, serverID, userID string) bool {
	srv, err := h.serverRepo.FindByID(c.Context(), serverID)
	if err == nil && srv.OwnerID == userID {
		return true
	}

	member, err := h.memberRepo.FindByServerAndUserWithRoles(c.Context(), serverID, userID)
	if err != nil {
		return false
	}

	return member.HasPermission(server.PermissionKickMembers) || member.HasPermission(server.PermissionManageServer)
}

func generateWallPostID() string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	return "wpos_" + clean[:21]
}
