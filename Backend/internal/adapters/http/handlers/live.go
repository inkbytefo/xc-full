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
	"pink/internal/domain/server"
)

// LiveHandler handles live streaming requests.
type LiveHandler struct {
	streamRepo    live.StreamRepository
	streamMsgRepo live.StreamMessageRepository
	categoryRepo  live.CategoryRepository
	memberRepo    server.MemberRepository
	recordingRepo live.RecordingRepository
}

// NewLiveHandler creates a new LiveHandler.
func NewLiveHandler(
	streamRepo live.StreamRepository,
	streamMsgRepo live.StreamMessageRepository,
	categoryRepo live.CategoryRepository,
	memberRepo server.MemberRepository,
	recordingRepo live.RecordingRepository,
) *LiveHandler {
	return &LiveHandler{
		streamRepo:    streamRepo,
		streamMsgRepo: streamMsgRepo,
		categoryRepo:  categoryRepo,
		memberRepo:    memberRepo,
		recordingRepo: recordingRepo,
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

// GetChatHistory returns chat messages for a stream.
// GET /live/streams/:id/messages
func (h *LiveHandler) GetChatHistory(c *fiber.Ctx) error {
	id := c.Params("id")
	limit := c.QueryInt("limit", 50)
	before := c.Query("before")

	messages, err := h.streamMsgRepo.FindByStreamID(c.Context(), id, limit, before)
	if err != nil {
		slog.Error("get chat history error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get chat history",
		))
	}

	response := make([]map[string]interface{}, len(messages))
	for i, msg := range messages {
		response[i] = chatMessageToDTO(msg)
	}

	return c.JSON(fiber.Map{"data": response})
}

// GetStreamRecordings returns recordings for a stream.
// GET /live/streams/:id/vods
func (h *LiveHandler) GetStreamRecordings(c *fiber.Ctx) error {
	id := c.Params("id")

	recordings, err := h.recordingRepo.FindByStreamID(c.Context(), id)
	if err != nil {
		slog.Error("get recordings error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get recordings",
		))
	}

	return c.JSON(fiber.Map{"data": recordings})
}

// GetMyStream returns the authenticated user's stream.
// GET /live/me
func (h *LiveHandler) GetMyStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	stream, err := h.streamRepo.FindByUserID(c.Context(), userID)
	if err != nil {
		if errors.Is(err, live.ErrStreamNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
				"NOT_FOUND",
				"You don't have a stream completely set up yet",
			))
		}
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": streamToDTO(stream)})
}

// UpdateMyStream updates the authenticated user's stream.
// PUT /live/me
func (h *LiveHandler) UpdateMyStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	stream, err := h.streamRepo.FindByUserID(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
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
		slog.Error("update my stream error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to update stream",
		))
	}

	return c.JSON(fiber.Map{"data": streamToDTO(stream)})
}

// RegenerateStreamKey generates a new stream key.
// POST /live/me/regenerate-key
func (h *LiveHandler) RegenerateStreamKey(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	stream, err := h.streamRepo.FindByUserID(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	newKey := generateStreamKey()
	stream.StreamKey = newKey

	// Update ingestion/verification URLs if they contain the key
	omeHost := "localhost" // TODO: Config
	stream.IngestURL = "rtmp://" + omeHost + ":1935/live/" + newKey
	stream.PlaybackURL = "http://" + omeHost + ":3333/live/" + newKey + "/llhls.m3u8"

	if err := h.streamRepo.Update(c.Context(), stream); err != nil {
		slog.Error("regenerate key error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to update stream key",
		))
	}

	return c.JSON(fiber.Map{
		"streamKey": newKey,
		"ingestUrl": stream.IngestURL,
	})
}

// GetStreamAnalytics returns analytics for the user's stream.
// GET /live/me/analytics
func (h *LiveHandler) GetStreamAnalytics(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	stream, err := h.streamRepo.FindByUserID(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	resp := dto.StreamAnalyticsResponse{
		StreamID:    stream.ID,
		ViewerCount: stream.ViewerCount,
		Status:      string(stream.Status),
	}

	if stream.StartedAt != nil {
		resp.StartedAt = stream.StartedAt.Format("2006-01-02T15:04:05.000Z")
		if stream.Status == live.StatusLive {
			duration := time.Since(*stream.StartedAt)
			resp.Duration = duration.String()
		}
	}

	return c.JSON(fiber.Map{"data": resp})
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

	// Handle stream type and permissions
	streamType := live.StreamTypeUser
	var serverID *string

	if req.Type == "server" {
		if req.ServerID == nil {
			return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
				"BAD_REQUEST",
				"Server ID is required for server streams",
			))
		}

		// Check permissions
		member, err := h.memberRepo.FindByServerAndUserWithRoles(c.Context(), *req.ServerID, userID)
		if err != nil {
			if errors.Is(err, server.ErrNotMember) {
				return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
					"FORBIDDEN",
					"Not a member of this server",
				))
			}
			return h.handleError(c, err)
		}

		if !member.HasPermission(server.PermissionStream) {
			return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
				"FORBIDDEN",
				"You do not have permission to stream in this server",
			))
		}

		streamType = live.StreamTypeServer
		serverID = req.ServerID
	}

	streamKey := generateStreamKey()
	// Generate RTMP/SRT/HLS URLs
	// TODO: Use config/env vars for OME host
	omeHost := "localhost" // Assuming client can resolve this or using public IP
	ingestURL := "rtmp://" + omeHost + ":1935/live/" + streamKey
	playbackURL := "http://" + omeHost + ":3333/live/" + streamKey + "/llhls.m3u8"

	now := time.Now()
	stream := &live.Stream{
		ID:          generateStreamID(),
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		CategoryID:  req.CategoryID,
		StreamKey:   streamKey,
		Status:      live.StatusOffline,
		ViewerCount: 0,
		IsNSFW:      req.IsNSFW,
		Type:        streamType,
		ServerID:    serverID,
		IngestURL:   ingestURL,
		PlaybackURL: playbackURL,
		MaxQuality:  "720p", // Default
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
		Type:        string(stream.Type),
		ServerID:    stream.ServerID,
		IngestURL:   stream.IngestURL,
		PlaybackURL: stream.PlaybackURL,
		StreamKey:   stream.StreamKey, // Only sent to owner ideally, but here simplifies for now
		MaxQuality:  stream.MaxQuality,
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

func chatMessageToDTO(msg *live.ChatMessage) map[string]interface{} {
	resp := map[string]interface{}{
		"id":         msg.ID,
		"stream_id":  msg.StreamID,
		"user_id":    msg.UserID,
		"content":    msg.Content,
		"created_at": msg.CreatedAt,
	}

	if msg.User != nil {
		resp["user"] = map[string]interface{}{
			"id":              msg.User.ID,
			"handle":          msg.User.Handle,
			"display_name":    msg.User.DisplayName,
			"avatar_gradient": msg.User.AvatarGradient,
			"is_verified":     msg.User.IsVerified,
		}
	}

	return resp
}
