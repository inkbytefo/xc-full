package handlers

import (
	"log/slog"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
)

// SearchRepository defines the interface for search operations.
type SearchRepository interface {
	SearchUsers(query string, limit int) ([]dto.SearchUserResult, error)
	SearchServers(query string, limit int) ([]dto.SearchServerResult, error)
	SearchPosts(query string, limit int) ([]dto.SearchPostResult, error)
}

// SearchHandler handles search requests.
type SearchHandler struct {
	searchRepo SearchRepository
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(searchRepo SearchRepository) *SearchHandler {
	return &SearchHandler{
		searchRepo: searchRepo,
	}
}

// Search performs a global search across all types.
// GET /search
func (h *SearchHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	limit := c.QueryInt("limit", 5)

	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Search query is required",
		))
	}

	if len(query) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Search query must be at least 2 characters",
		))
	}

	users, err := h.searchRepo.SearchUsers(query, limit)
	if err != nil {
		slog.Error("search users error", slog.Any("error", err))
		users = []dto.SearchUserResult{}
	}

	servers, err := h.searchRepo.SearchServers(query, limit)
	if err != nil {
		slog.Error("search servers error", slog.Any("error", err))
		servers = []dto.SearchServerResult{}
	}

	posts, err := h.searchRepo.SearchPosts(query, limit)
	if err != nil {
		slog.Error("search posts error", slog.Any("error", err))
		posts = []dto.SearchPostResult{}
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"users":   users,
			"servers": servers,
			"posts":   posts,
		},
	})
}

// SearchUsers searches for users.
// GET /search/users
func (h *SearchHandler) SearchUsers(c *fiber.Ctx) error {
	query := c.Query("q")
	limit := c.QueryInt("limit", 20)

	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Search query is required",
		))
	}

	users, err := h.searchRepo.SearchUsers(query, limit)
	if err != nil {
		slog.Error("search users error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to search users",
		))
	}

	return c.JSON(fiber.Map{"data": users})
}

// SearchServers searches for public servers.
// GET /search/servers
func (h *SearchHandler) SearchServers(c *fiber.Ctx) error {
	query := c.Query("q")
	limit := c.QueryInt("limit", 20)

	servers, err := h.searchRepo.SearchServers(query, limit)
	if err != nil {
		slog.Error("search servers error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to search servers",
		))
	}

	return c.JSON(fiber.Map{"data": servers})
}

// SearchPosts searches for posts.
// GET /search/posts
func (h *SearchHandler) SearchPosts(c *fiber.Ctx) error {
	query := c.Query("q")
	limit := c.QueryInt("limit", 20)

	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Search query is required",
		))
	}

	posts, err := h.searchRepo.SearchPosts(query, limit)
	if err != nil {
		slog.Error("search posts error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to search posts",
		))
	}

	return c.JSON(fiber.Map{"data": posts})
}
