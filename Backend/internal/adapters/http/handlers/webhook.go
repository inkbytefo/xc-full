package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"xcord/internal/domain/voice"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/livekit/protocol/livekit"
)

// WebhookHandler handles LiveKit webhooks.
type WebhookHandler struct {
	participantRepo voice.ParticipantRepository
	apiKey          string
	apiSecret       string
}

// NewWebhookHandler creates a new WebhookHandler.
func NewWebhookHandler(participantRepo voice.ParticipantRepository, apiKey, apiSecret string) *WebhookHandler {
	return &WebhookHandler{
		participantRepo: participantRepo,
		apiKey:          apiKey,
		apiSecret:       apiSecret,
	}
}

// Handle handles LiveKit webhook requests.
// POST /api/v1/webhooks/livekit
func (h *WebhookHandler) Handle(c *fiber.Ctx) error {
	sig := c.Get("Authorization")
	if sig == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("Missing Authorization header")
	}

	// Verify JWT manually
	token, err := jwt.Parse(sig, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(h.apiSecret), nil
	})

	if err != nil || !token.Valid {
		slog.Error("webhook jwt verification failed", slog.Any("error", err))
		return c.Status(fiber.StatusUnauthorized).SendString("Invalid signature")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).SendString("Invalid claims")
	}

	// Verify body hash if present in claims
	if sha, ok := claims["sha256"].(string); ok {
		hasher := sha256.New()
		hasher.Write(c.Body())
		bodySha := hex.EncodeToString(hasher.Sum(nil))
		if sha != bodySha {
			slog.Error("webhook body hash mismatch", slog.String("expected", sha), slog.String("actual", bodySha))
			return c.Status(fiber.StatusUnauthorized).SendString("Body hash mismatch")
		}
	}

	// Decode event (LiveKit webhooks are JSON)
	var event livekit.WebhookEvent
	if err := c.BodyParser(&event); err != nil {
		slog.Error("failed to decode webhook event", slog.Any("error", err))
		return c.Status(fiber.StatusBadRequest).SendString("Invalid body")
	}

	slog.Info("LiveKit webhook received",
		slog.String("event", string(event.Event)),
		slog.String("room", event.Room.Name),
		slog.String("participant", event.Participant.Identity),
	)

	switch event.Event {
	case "participant_joined":
		h.handleParticipantJoined(c, &event)
	case "participant_left":
		h.handleParticipantLeft(c, &event)
	case "room_finished":
		h.handleRoomFinished(c, &event)
	}

	return c.SendStatus(http.StatusOK)
}

func (h *WebhookHandler) handleParticipantJoined(c *fiber.Ctx, event *livekit.WebhookEvent) {
	if len(event.Room.Name) > 3 && event.Room.Name[:3] == "vc_" {
		channelID := event.Room.Name[3:]
		p := &voice.Participant{
			UserID:    event.Participant.Identity,
			ChannelID: channelID,
			JoinedAt:  time.Now(),
		}
		err := h.participantRepo.Join(c.Context(), p)
		if err != nil {
			slog.Error("failed to process participant joined", slog.Any("error", err), slog.String("userId", p.UserID))
		}
	}
}

func (h *WebhookHandler) handleParticipantLeft(c *fiber.Ctx, event *livekit.WebhookEvent) {
	err := h.participantRepo.Leave(c.Context(), event.Participant.Identity)
	if err != nil {
		slog.Error("failed to process participant left", slog.Any("error", err), slog.String("userId", event.Participant.Identity))
	}
}

func (h *WebhookHandler) handleRoomFinished(c *fiber.Ctx, event *livekit.WebhookEvent) {
	if len(event.Room.Name) > 3 && event.Room.Name[:3] == "vc_" {
		channelID := event.Room.Name[3:]
		err := h.participantRepo.DeleteByChannelID(c.Context(), channelID)
		if err != nil {
			slog.Error("failed to clear participants on room finish", slog.Any("error", err), slog.String("channelId", channelID))
		}
	}
}
