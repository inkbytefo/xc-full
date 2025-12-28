package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"pink/internal/domain/live"
	"pink/internal/domain/notification"
	"pink/internal/domain/user"
)

// OMEWebhookHandler handles OvenMediaEngine admission webhooks.
type OMEWebhookHandler struct {
	streamRepo       live.StreamRepository
	followRepo       user.FollowRepository
	notificationRepo notification.Repository
	recordingRepo    live.RecordingRepository
	secretKey        string
	logger           *slog.Logger
}

// NewOMEWebhookHandler creates a new OMEWebhookHandler.
func NewOMEWebhookHandler(
	streamRepo live.StreamRepository,
	followRepo user.FollowRepository,
	notificationRepo notification.Repository,
	recordingRepo live.RecordingRepository,
	secretKey string,
	logger *slog.Logger,
) *OMEWebhookHandler {
	return &OMEWebhookHandler{
		streamRepo:       streamRepo,
		followRepo:       followRepo,
		notificationRepo: notificationRepo,
		recordingRepo:    recordingRepo,
		secretKey:        secretKey,
		logger:           logger,
	}
}

// OMEAdmissionRequest represents the OME admission webhook request.
type OMEAdmissionRequest struct {
	Client struct {
		Address string `json:"address"`
		Port    int    `json:"port"`
	} `json:"client"`
	Request struct {
		Direction string `json:"direction"` // "incoming" or "outgoing"
		Command   string `json:"command"`   // "open" or "close"
		Protocol  string `json:"protocol"`  // "rtmp", "srt", etc.
		URL       string `json:"url"`
		Time      string `json:"time"`
	} `json:"request"`
}

// OMEAdmissionResponse represents the OME admission webhook response.
type OMEAdmissionResponse struct {
	Allowed  bool   `json:"allowed"`
	Reason   string `json:"reason,omitempty"`
	StreamID string `json:"new_url,omitempty"` // Rename stream to ID
}

// HandleAdmission handles the OME admission webhook (stream start).
// POST /api/webhooks/ome
func (h *OMEWebhookHandler) HandleAdmission(c *fiber.Ctx) error {
	// Verify signature if secret key is set
	if h.secretKey != "" {
		signature := c.Get("X-OME-Signature")
		if !h.verifySignature(c.Body(), signature) {
			h.logger.Warn("OME webhook signature verification failed")
			return c.Status(401).JSON(OMEAdmissionResponse{
				Allowed: false,
				Reason:  "Invalid signature",
			})
		}
	}

	var req OMEAdmissionRequest
	if err := c.BodyParser(&req); err != nil {
		h.logger.Error("Failed to parse OME webhook", "error", err)
		return c.Status(400).JSON(OMEAdmissionResponse{
			Allowed: false,
			Reason:  "Invalid request body",
		})
	}

	h.logger.Info("OME admission webhook",
		"direction", req.Request.Direction,
		"protocol", req.Request.Protocol,
		"url", req.Request.URL,
	)

	// Extract stream key from URL
	// URL format: /live/{stream_key}
	streamKey := extractStreamKey(req.Request.URL)
	if streamKey == "" {
		return c.JSON(OMEAdmissionResponse{
			Allowed: false,
			Reason:  "Missing stream key",
		})
	}

	// Handle command
	if req.Request.Command == "close" {
		// Only handle incoming (publisher) close events
		if req.Request.Direction == "incoming" {
			return h.handleClose(c, streamKey)
		}
		return c.JSON(OMEAdmissionResponse{Allowed: true})
	}

	// Only authenticate incoming streams (publishers)
	if req.Request.Direction == "incoming" {
		return h.handlePublish(c, streamKey)
	}

	// Allow outgoing (viewers) by default
	return c.JSON(OMEAdmissionResponse{Allowed: true})
}

// handlePublish authenticates a stream publish request.
func (h *OMEWebhookHandler) handlePublish(c *fiber.Ctx, streamKey string) error {
	ctx := c.Context()

	// Find stream by key
	stream, err := h.streamRepo.FindByStreamKey(ctx, streamKey)
	if err != nil {
		h.logger.Warn("Invalid stream key", "key", streamKey[:8]+"...")
		return c.JSON(OMEAdmissionResponse{
			Allowed: false,
			Reason:  "Invalid stream key",
		})
	}

	// Check if user already streaming
	if stream.Status == live.StatusLive {
		h.logger.Warn("Stream already live", "stream_id", stream.ID)
		return c.JSON(OMEAdmissionResponse{
			Allowed: false,
			Reason:  "Already streaming",
		})
	}

	// Set stream to live
	now := time.Now()
	stream.Status = live.StatusLive
	stream.StartedAt = &now

	if err := h.streamRepo.UpdateStatus(ctx, stream.ID, live.StatusLive); err != nil {
		h.logger.Error("Failed to update stream status", "error", err)
		return c.JSON(OMEAdmissionResponse{
			Allowed: false,
			Reason:  "Internal error",
		})
	}

	h.logger.Info("Stream started",
		"stream_id", stream.ID,
		"user_id", stream.UserID,
		"type", stream.Type,
	)

	// Send go-live notifications
	go h.sendGoLiveNotifications(stream)

	return c.JSON(OMEAdmissionResponse{
		Allowed:  true,
		StreamID: stream.ID,
	})
}

// handleClose handles stream stop events.
func (h *OMEWebhookHandler) handleClose(c *fiber.Ctx, streamKey string) error {
	ctx := c.Context()

	stream, err := h.streamRepo.FindByStreamKey(ctx, streamKey)
	if err != nil {
		// If stream not found, just return allowed (it might be already deleted)
		return c.JSON(OMEAdmissionResponse{Allowed: true})
	}

	if stream.Status == live.StatusOffline {
		return c.JSON(OMEAdmissionResponse{Allowed: true})
	}

	// Calculate duration
	var durationStr string
	if stream.StartedAt != nil {
		d := time.Since(*stream.StartedAt)
		durationStr = d.String()
	}

	// Set stream to offline
	if err := h.streamRepo.UpdateStatus(ctx, stream.ID, live.StatusOffline); err != nil {
		h.logger.Error("Failed to update stream status to offline", "error", err, "stream_id", stream.ID)
	}

	h.logger.Info("Stream stopped", "stream_id", stream.ID)

	// Create Recording record
	// We assume OME saves file at: /app/recordings/default/live/{stream}/{date}.mp4
	// But since we can't easily traverse the exact filename without timestamp,
	// we'll scan the directory or better yet, since we don't know the exact start time filename,
	// we can try to find the latest file in that directory.
	// For MVP, we will construct a likely path or defer this scanning to a worker.
	// However, OME <File> publisher uses ${StartTime:YYYYMMDD_HHmmss}.mp4.
	// We can't know the exact second it started.
	// A better approach is to assume the client/OBS sends streams and we can just list files in that folder.

	// TODO: Implement sophisticated file discovery.
	// For now, we'll create the record with a placeholder path that points to the folder.
	// Or we can use `filepath.Glob` if we know the pattern.

	// Pattern: /app/recordings/default/live/<streamKey>/*.mp4
	// Note: We mounted ./recordings to /app/recordings in docker-compose for api service.

	// Let's defer actual file finding to a background job or just log it for now.
	// We'll create the DB record so it shows up in UI.

	recording := &live.Recording{
		ID:        uuid.New().String(),
		StreamID:  stream.ID,
		UserID:    stream.UserID,                                          // Use UserID from stream
		FilePath:  fmt.Sprintf("/recordings/default/live/%s/", streamKey), // Points to folder for now
		Duration:  durationStr,
		CreatedAt: time.Now(),
	}

	if err := h.recordingRepo.Create(ctx, recording); err != nil {
		h.logger.Error("Failed to create recording", "error", err, "stream_id", stream.ID)
	}

	return c.JSON(OMEAdmissionResponse{Allowed: true})
}

// sendGoLiveNotifications sends notifications to followers.
func (h *OMEWebhookHandler) sendGoLiveNotifications(stream *live.Stream) {
	ctx := context.Background()
	// Timeout for the entire notification process
	ctx, cancel := context.WithTimeout(ctx, 1*time.Minute)
	defer cancel()

	// Only notify for user streams for now
	// TODO: Handle server stream notifications (notify guild members)
	if stream.Type != live.StreamTypeUser {
		return
	}

	limit := 100
	cursor := ""

	for {
		followers, nextCursor, err := h.followRepo.FindFollowers(ctx, stream.UserID, cursor, limit)
		if err != nil {
			h.logger.Error("Failed to fetch followers for notification", "error", err, "user_id", stream.UserID)
			return
		}

		if len(followers) == 0 {
			break
		}

		for _, follow := range followers {
			// Create notification
			notif := &notification.Notification{
				ID:         uuid.New().String(),
				UserID:     follow.FollowerID,
				Type:       notification.TypeStreamLive,
				ActorID:    &stream.UserID,
				TargetType: stringPtr("stream"),
				TargetID:   &stream.ID,
				Message:    stream.Title,
				IsRead:     false,
				CreatedAt:  time.Now(),
			}

			if err := h.notificationRepo.Create(ctx, notif); err != nil {
				h.logger.Error("Failed to create notification", "error", err, "target_user_id", follow.FollowerID)
			}
		}

		if nextCursor == "" {
			break
		}
		cursor = nextCursor
	}

	h.logger.Info("Sent go-live notifications", "stream_id", stream.ID)
}

func stringPtr(s string) *string {
	return &s
}

// verifySignature verifies the OME webhook signature.
func (h *OMEWebhookHandler) verifySignature(body []byte, signature string) bool {
	if signature == "" {
		return false
	}

	mac := hmac.New(sha1.New, []byte(h.secretKey))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expected), []byte(signature))
}

// extractStreamKey extracts the stream key from the URL path.
// URL format: /live/{stream_key} or rtmp://host:port/live/{stream_key}
func extractStreamKey(url string) string {
	// Simple extraction - find last path segment
	for i := len(url) - 1; i >= 0; i-- {
		if url[i] == '/' {
			key := url[i+1:]
			// Remove query parameters if any
			for j := 0; j < len(key); j++ {
				if key[j] == '?' {
					return key[:j]
				}
			}
			return key
		}
	}
	return ""
}
