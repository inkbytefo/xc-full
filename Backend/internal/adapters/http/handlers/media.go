package handlers

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"pink/internal/adapters/http/dto"
	"pink/internal/domain/media"
)

// MediaHandler handles media upload requests.
type MediaHandler struct {
	mediaRepo media.Repository
	uploadDir string
	baseURL   string
}

// NewMediaHandler creates a new MediaHandler.
func NewMediaHandler(mediaRepo media.Repository, uploadDir, baseURL string) *MediaHandler {
	// Ensure upload directory exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		slog.Error("failed to create upload directory", slog.Any("error", err))
	}

	return &MediaHandler{
		mediaRepo: mediaRepo,
		uploadDir: uploadDir,
		baseURL:   baseURL,
	}
}

// Upload handles file upload.
// POST /media/upload
func (h *MediaHandler) Upload(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"No file provided",
		))
	}

	// Validate file size
	if err := media.ValidateFileSize(file.Size); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"FILE_TOO_LARGE",
			fmt.Sprintf("File size exceeds limit of %d MB", media.MaxFileSize/(1024*1024)),
		))
	}

	// Get MIME type
	mimeType := file.Header.Get("Content-Type")
	mediaType, err := media.ValidateMimeType(mimeType)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_TYPE",
			"File type not allowed",
		))
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Create user directory
	userDir := filepath.Join(h.uploadDir, userID)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		slog.Error("failed to create user directory", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to save file",
		))
	}

	// Save file
	filePath := filepath.Join(userDir, filename)
	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to open file",
		))
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to save file",
		))
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to save file",
		))
	}

	// Create media record
	mediaID := fmt.Sprintf("med_%s", uuid.New().String()[:8])
	url := fmt.Sprintf("%s/uploads/%s/%s", h.baseURL, userID, filename)

	m := &media.Media{
		ID:           mediaID,
		UserID:       userID,
		Filename:     filename,
		OriginalName: file.Filename,
		MimeType:     mimeType,
		Type:         mediaType,
		Size:         file.Size,
		URL:          url,
		CreatedAt:    time.Now(),
	}

	if err := h.mediaRepo.Create(c.Context(), m); err != nil {
		// Delete file if database insert fails
		os.Remove(filePath)
		slog.Error("failed to save media record", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to save media",
		))
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": mediaToDTO(m),
	})
}

// Get returns a media by ID.
// GET /media/:id
func (h *MediaHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")

	m, err := h.mediaRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": mediaToDTO(m),
	})
}

// List returns user's media.
// GET /media
func (h *MediaHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	items, err := h.mediaRepo.FindByUserID(c.Context(), userID, limit, offset)
	if err != nil {
		slog.Error("failed to list media", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to list media",
		))
	}

	response := make([]dto.MediaResponse, len(items))
	for i, m := range items {
		response[i] = mediaToDTO(m)
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// Delete removes a media.
// DELETE /media/:id
func (h *MediaHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Get media to verify ownership
	m, err := h.mediaRepo.FindByID(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	if m.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not your media",
		))
	}

	// Delete file
	filePath := filepath.Join(h.uploadDir, userID, m.Filename)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		slog.Warn("failed to delete file", slog.Any("error", err))
	}

	// Delete record
	if err := h.mediaRepo.Delete(c.Context(), id); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *MediaHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, media.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Media not found",
		))
	default:
		slog.Error("media handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func mediaToDTO(m *media.Media) dto.MediaResponse {
	return dto.MediaResponse{
		ID:           m.ID,
		Filename:     m.Filename,
		OriginalName: m.OriginalName,
		MimeType:     m.MimeType,
		Type:         string(m.Type),
		Size:         m.Size,
		URL:          m.URL,
		CreatedAt:    m.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}
}

// ServeUploads creates a handler to serve uploaded files.
func ServeUploads(uploadDir string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get path parts
		path := c.Params("*")
		if path == "" || strings.Contains(path, "..") {
			return c.SendStatus(fiber.StatusNotFound)
		}

		filePath := filepath.Join(uploadDir, path)

		// Check if file exists
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			return c.SendStatus(fiber.StatusNotFound)
		}

		return c.SendFile(filePath)
	}
}
