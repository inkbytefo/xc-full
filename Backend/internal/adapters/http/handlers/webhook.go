package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"pink/internal/domain/channel"
	"pink/internal/domain/user"
	"pink/internal/domain/voice"
	"pink/internal/domain/ws"
	wsInfra "pink/internal/infrastructure/ws"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/livekit/protocol/livekit"
)

// WebhookHandler handles LiveKit webhooks.
type WebhookHandler struct {
	participantRepo voice.ParticipantRepository
	channelRepo     channel.Repository
	userRepo        user.Repository
	wsHub           *wsInfra.Hub
	apiKey          string
	apiSecret       string
}

// NewWebhookHandler creates a new WebhookHandler.
func NewWebhookHandler(
	participantRepo voice.ParticipantRepository,
	channelRepo channel.Repository,
	userRepo user.Repository,
	wsHub *wsInfra.Hub,
	apiKey, apiSecret string,
) *WebhookHandler {
	return &WebhookHandler{
		participantRepo: participantRepo,
		channelRepo:     channelRepo,
		userRepo:        userRepo,
		wsHub:           wsHub,
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
		identity := event.Participant.Identity

		// 1. Update DB
		p := &voice.Participant{
			UserID:    identity,
			ChannelID: channelID,
			JoinedAt:  time.Now(),
		}
		err := h.participantRepo.Join(c.Context(), p)
		if err != nil {
			slog.Error("failed to process participant joined", slog.Any("error", err), slog.String("userId", identity))
		}

		// 2. Fetch details for broadcast
		h.broadcastVoiceUpdate(c.Context(), channelID, identity, "joined")
	}
}

func (h *WebhookHandler) handleParticipantLeft(c *fiber.Ctx, event *livekit.WebhookEvent) {
	identity := event.Participant.Identity

	// If room active, broadcast leaving
	if len(event.Room.Name) > 3 && event.Room.Name[:3] == "vc_" {
		channelID := event.Room.Name[3:]

		err := h.participantRepo.Leave(c.Context(), identity)
		if err != nil {
			slog.Error("failed to process participant left", slog.Any("error", err), slog.String("userId", identity))
		}

		h.broadcastVoiceUpdate(c.Context(), channelID, identity, "left")
	}
}

func (h *WebhookHandler) handleRoomFinished(c *fiber.Ctx, event *livekit.WebhookEvent) {
	if len(event.Room.Name) > 3 && event.Room.Name[:3] == "vc_" {
		channelID := event.Room.Name[3:]
		// On room finish, everyone left implicitly?
		// LiveKit sends left events for participants usually.
		err := h.participantRepo.DeleteByChannelID(c.Context(), channelID)
		if err != nil {
			slog.Error("failed to clear participants on room finish", slog.Any("error", err), slog.String("channelId", channelID))
		}
	}
}

func (h *WebhookHandler) broadcastVoiceUpdate(ctx context.Context, channelID, userID, action string) {
	// Find Channel to get ServerID
	ch, err := h.channelRepo.FindByID(ctx, channelID)
	if err != nil {
		slog.Error("webhook: channel not found", slog.String("channelId", channelID), slog.Any("error", err))
		return
	}

	// Find User to get Handle/Avatar
	u, err := h.userRepo.FindByID(ctx, userID)
	if err != nil {
		slog.Error("webhook: user not found", slog.String("userId", userID), slog.Any("error", err))
		return
	}

	avatar := ""
	if len(u.AvatarGradient) > 0 {
		avatar = u.AvatarGradient[0] // Simplify/Mock for now or send full array
	}

	eventData := ws.VoiceStateUpdateEventData{
		ServerID:        ch.ServerID,
		ChannelID:       channelID,
		UserID:          userID,
		UserHandle:      u.Handle,
		UserDisplayName: u.DisplayName,
		UserAvatar:      avatar,
		Action:          action,
	}

	msg, _ := ws.NewMessage(ws.EventVoiceStateUpdate, eventData)
	data, _ := json.Marshal(msg)

	h.wsHub.BroadcastToSubscription(ws.SubServer, ch.ServerID, data)
}
