package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"pink/internal/adapters/http/dto"
	"pink/internal/domain/live"
)

// LiveHandler handles live streaming requests.
type LiveHandler struct {
	streamRepo   live.StreamRepository
	categoryRepo live.CategoryRepository
}

// NewLiveHandler creates a new LiveHandler.
func NewLiveHandler(streamRepo live.StreamRepository, categoryRepo live.CategoryRepository) *LiveHandler {
	return &LiveHandler{
		streamRepo:   streamRepo,
		categoryRepo: categoryRepo,
	}
}

// GetStreams returns live streams.
// GET /live/streams
func (h *LiveHandler) GetStreams(c *fiber.Ctx) error {
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	streams, nextCursor, err := h.streamRepo.FindLive(c.Context(), cursor, limit)
	if err != nil {
		slog.Error("get live streams error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get streams",
		))
	}

	response := make([]dto.StreamResponse, len(streams))
	for i, stream := range streams {
		response[i] = streamToDTO(stream)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

// GetStream returns a stream by ID.
// GET /live/streams/:id
func (h *LiveHandler) GetStream(c *fiber.Ctx) error {
	id := c.Params("id")

	stream, err := h.streamRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": streamToDTO(stream)})
}

// StartStream starts a new stream.
// POST /live/streams
func (h *LiveHandler) StartStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Check if user already has an active stream
	_, err := h.streamRepo.FindByUserID(c.Context(), userID)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"ALREADY_STREAMING",
			"You already have an active stream",
		))
	}

	var req dto.StartStreamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if len(req.Title) < 3 || len(req.Title) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_TITLE",
			"Title must be between 3 and 100 characters",
		))
	}

	now := time.Now()
	stream := &live.Stream{
		ID:          generateStreamID(),
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		CategoryID:  req.CategoryID,
		StreamKey:   generateStreamKey(),
		Status:      live.StatusOffline,
		ViewerCount: 0,
		IsNSFW:      req.IsNSFW,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.streamRepo.Create(c.Context(), stream); err != nil {
		slog.Error("create stream error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to create stream",
		))
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": streamToDTO(stream),
	})
}

// UpdateStream updates a stream.
// PATCH /live/streams/:id
func (h *LiveHandler) UpdateStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	stream, err := h.streamRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	if stream.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not your stream",
		))
	}

	var req dto.UpdateStreamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if req.Title != "" {
		stream.Title = req.Title
	}
	if req.Description != nil {
		stream.Description = *req.Description
	}
	if req.CategoryID != nil {
		stream.CategoryID = req.CategoryID
	}
	if req.IsNSFW != nil {
		stream.IsNSFW = *req.IsNSFW
	}

	if err := h.streamRepo.Update(c.Context(), stream); err != nil {
		slog.Error("update stream error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to update stream",
		))
	}

	return c.JSON(fiber.Map{"data": streamToDTO(stream)})
}

// GoLive makes the stream live.
// POST /live/streams/:id/live
func (h *LiveHandler) GoLive(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	stream, err := h.streamRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	if stream.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not your stream",
		))
	}

	if err := h.streamRepo.UpdateStatus(c.Context(), id, live.StatusLive); err != nil {
		slog.Error("go live error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to go live",
		))
	}

	// Update category stream count
	if stream.CategoryID != nil {
		if err := h.categoryRepo.UpdateStreamCount(c.Context(), *stream.CategoryID, 1); err != nil {
			slog.Warn("update category stream count error", slog.Any("error", err))
		}
	}

	return c.JSON(fiber.Map{"message": "Stream is now live"})
}

// EndStream ends a stream.
// DELETE /live/streams/:id
func (h *LiveHandler) EndStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	stream, err := h.streamRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	if stream.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not your stream",
		))
	}

	if err := h.streamRepo.UpdateStatus(c.Context(), id, live.StatusOffline); err != nil {
		slog.Error("end stream error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to end stream",
		))
	}

	// Update category stream count
	if stream.CategoryID != nil {
		if err := h.categoryRepo.UpdateStreamCount(c.Context(), *stream.CategoryID, -1); err != nil {
			slog.Warn("update category stream count error", slog.Any("error", err))
		}
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// GetCategories returns all categories.
// GET /live/categories
func (h *LiveHandler) GetCategories(c *fiber.Ctx) error {
	categories, err := h.categoryRepo.FindAll(c.Context())
	if err != nil {
		slog.Error("get categories error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get categories",
		))
	}

	response := make([]dto.CategoryResponse, len(categories))
	for i, cat := range categories {
		response[i] = categoryToDTO(cat)
	}

	return c.JSON(fiber.Map{"data": response})
}

// GetCategoryStreams returns streams in a category.
// GET /live/categories/:id/streams
func (h *LiveHandler) GetCategoryStreams(c *fiber.Ctx) error {
	id := c.Params("id")
	cursor := c.Query("cursor")
	limit := c.QueryInt("limit", 20)

	streams, nextCursor, err := h.streamRepo.FindByCategoryID(c.Context(), id, cursor, limit)
	if err != nil {
		slog.Error("get category streams error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get streams",
		))
	}

	response := make([]dto.StreamResponse, len(streams))
	for i, stream := range streams {
		response[i] = streamToDTO(stream)
	}

	result := fiber.Map{"data": response}
	if nextCursor != "" {
		result["nextCursor"] = nextCursor
	}

	return c.JSON(result)
}

func (h *LiveHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, live.ErrStreamNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Stream not found",
		))
	case errors.Is(err, live.ErrCategoryNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Category not found",
		))
	default:
		slog.Error("live handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func streamToDTO(stream *live.Stream) dto.StreamResponse {
	resp := dto.StreamResponse{
		ID:          stream.ID,
		UserID:      stream.UserID,
		Title:       stream.Title,
		Description: stream.Description,
		CategoryID:  stream.CategoryID,
		Status:      string(stream.Status),
		ViewerCount: stream.ViewerCount,
		IsNSFW:      stream.IsNSFW,
		CreatedAt:   stream.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}

	if stream.StartedAt != nil {
		t := stream.StartedAt.Format("2006-01-02T15:04:05.000Z")
		resp.StartedAt = &t
	}

	if stream.Streamer != nil {
		resp.Streamer = &dto.StreamerResponse{
			ID:             stream.Streamer.ID,
			Handle:         stream.Streamer.Handle,
			DisplayName:    stream.Streamer.DisplayName,
			AvatarGradient: stream.Streamer.AvatarGradient,
			IsVerified:     stream.Streamer.IsVerified,
		}
	}

	if stream.Category != nil {
		resp.Category = &dto.CategoryResponse{
			ID:   stream.Category.ID,
			Name: stream.Category.Name,
			Slug: stream.Category.Slug,
		}
	}

	return resp
}

func categoryToDTO(cat *live.Category) dto.CategoryResponse {
	return dto.CategoryResponse{
		ID:          cat.ID,
		Name:        cat.Name,
		Slug:        cat.Slug,
		Description: cat.Description,
		IconURL:     cat.IconURL,
		StreamCount: cat.StreamCount,
	}
}

func generateStreamID() string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	return "stream_" + clean[:19]
}

func generateStreamKey() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return uuid.New().String()
	}
	return hex.EncodeToString(b)
}
