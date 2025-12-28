package handlers

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"pink/internal/adapters/http/dto"
	feedApp "pink/internal/application/feed"
	"pink/internal/domain/post"
)

// FeedHandler handles feed-related requests.
type FeedHandler struct {
	feedService *feedApp.Service
}

// NewFeedHandler creates a new FeedHandler.
func NewFeedHandler(feedService *feedApp.Service) *FeedHandler {
	return &FeedHandler{feedService: feedService}
}

// GetFeed returns the user's feed.
// GET /feed
func (h *FeedHandler) GetFeed(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	posts, nextCursor, err := h.feedService.GetFeed(c.Context(), userID, cursor, limit)
	if err != nil {
		slog.Error("get feed error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get feed",
		))
	}

	response := make([]dto.PostResponse, len(posts))
	for i, p := range posts {
		response[i] = postToDTO(p)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

// CreatePost creates a new post.
// POST /posts
func (h *FeedHandler) CreatePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req dto.CreatePostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if err := dto.Validate(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"VALIDATION_ERROR",
			err.Error(),
		))
	}

	p, err := h.feedService.CreatePost(c.Context(), feedApp.CreatePostCommand{
		AuthorID:   userID,
		Content:    req.Content,
		Visibility: post.Visibility(req.Visibility),
		ServerID:   req.ServerID,
		ReplyToID:  req.ReplyToID,
		MediaURLs:  req.MediaURLs,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": postToDTO(p),
	})
}

// GetPost returns a single post.
// GET /posts/:id
func (h *FeedHandler) GetPost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	p, err := h.feedService.GetPost(c.Context(), postID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": postToDTO(p),
	})
}

// DeletePost deletes a post.
// DELETE /posts/:id
func (h *FeedHandler) DeletePost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	if err := h.feedService.DeletePost(c.Context(), postID, userID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ToggleLike toggles like on a post.
// POST /posts/:id/like
func (h *FeedHandler) ToggleLike(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	liked, err := h.feedService.ToggleReaction(c.Context(), postID, userID, post.ReactionLike)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"liked": liked,
	})
}

// ToggleRepost toggles repost on a post.
// POST /posts/:id/repost
func (h *FeedHandler) ToggleRepost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	reposted, err := h.feedService.ToggleReaction(c.Context(), postID, userID, post.ReactionRepost)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"reposted": reposted,
	})
}

// ToggleBookmark toggles bookmark on a post.
// POST /posts/:id/bookmark
func (h *FeedHandler) ToggleBookmark(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	postID := c.Params("id")

	bookmarked, err := h.feedService.ToggleReaction(c.Context(), postID, userID, post.ReactionBookmark)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"bookmarked": bookmarked,
	})
}

// GetLikers returns users who liked a post.
// GET /posts/:id/likes
func (h *FeedHandler) GetLikers(c *fiber.Ctx) error {
	postID := c.Params("id")
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	reactions, nextCursor, err := h.feedService.GetPostLikers(c.Context(), postID, cursor, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	userIDs := make([]string, len(reactions))
	for i, r := range reactions {
		userIDs[i] = r.UserID
	}

	result := fiber.Map{"data": userIDs}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

// GetUserPosts returns posts by a user.
// GET /users/:id/posts
func (h *FeedHandler) GetUserPosts(c *fiber.Ctx) error {
	viewerID := c.Locals("userID").(string)
	authorID := c.Params("id")
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	posts, nextCursor, err := h.feedService.GetUserPosts(c.Context(), authorID, viewerID, cursor, limit)
	if err != nil {
		return h.handleError(c, err)
	}

	response := make([]dto.PostResponse, len(posts))
	for i, p := range posts {
		response[i] = postToDTO(p)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

func (h *FeedHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, post.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Post not found",
		))

	case errors.Is(err, post.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to perform this action",
		))

	case errors.Is(err, post.ErrInvalidContent):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_CONTENT",
			"Content must be between 1 and 1000 characters",
		))

	case errors.Is(err, post.ErrServerIDRequired):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"SERVER_ID_REQUIRED",
			"Server ID is required for server visibility posts",
		))

	default:
		slog.Error("feed handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func postToDTO(p *post.Post) dto.PostResponse {
	resp := dto.PostResponse{
		ID:           p.ID,
		AuthorID:     p.AuthorID,
		Content:      p.Content,
		Visibility:   string(p.Visibility),
		MediaURLs:    p.MediaURLs,
		LikeCount:    p.LikeCount,
		RepostCount:  p.RepostCount,
		ReplyCount:   p.ReplyCount,
		IsLiked:      p.IsLiked,
		IsReposted:   p.IsReposted,
		IsBookmarked: p.IsBookmarked,
		CreatedAt:    p.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if p.ServerID != nil {
		resp.ServerID = p.ServerID
	}
	if p.ReplyToID != nil {
		resp.ReplyToID = p.ReplyToID
	}
	if p.RepostOfID != nil {
		resp.RepostOfID = p.RepostOfID
	}

	if p.Author != nil {
		resp.Author = &dto.PostAuthorResponse{
			ID:             p.Author.ID,
			Handle:         p.Author.Handle,
			DisplayName:    p.Author.DisplayName,
			AvatarGradient: p.Author.AvatarGradient,
			IsVerified:     p.Author.IsVerified,
		}
	}

	return resp
}
