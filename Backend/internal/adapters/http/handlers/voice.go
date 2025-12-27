package handlers

import (
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/domain/channel"
	"xcord/internal/domain/server"
	"xcord/internal/domain/user"
	"xcord/internal/infrastructure/livekit"
)

// VoiceHandler handles voice/video channel requests using unified channel system.
type VoiceHandler struct {
	channelRepo channel.Repository
	memberRepo  server.MemberRepository
	serverRepo  server.Repository
	userRepo    user.Repository
	livekit     *livekit.Service
}

// NewVoiceHandler creates a new VoiceHandler.
func NewVoiceHandler(
	channelRepo channel.Repository,
	memberRepo server.MemberRepository,
	serverRepo server.Repository,
	userRepo user.Repository,
	livekit *livekit.Service,
) *VoiceHandler {
	return &VoiceHandler{
		channelRepo: channelRepo,
		memberRepo:  memberRepo,
		serverRepo:  serverRepo,
		userRepo:    userRepo,
		livekit:     livekit,
	}
}

// GetVoiceChannels returns voice channels for a server.
// GET /servers/:id/voice-channels
func (h *VoiceHandler) GetVoiceChannels(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	// Verify membership
	_, err := h.memberRepo.FindByServerAndUser(c.Context(), serverID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a server member",
		))
	}

	channels, err := h.channelRepo.FindVoiceEnabled(c.Context(), serverID)
	if err != nil {
		slog.Error("get voice channels error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to get voice channels",
		))
	}

	response := make([]dto.VoiceChannelResponse, len(channels))
	for i, ch := range channels {
		response[i] = voiceChannelToDTO(ch)
	}

	return c.JSON(fiber.Map{"data": response})
}

// CreateVoiceChannel creates a new voice channel.
// POST /servers/:id/voice-channels
func (h *VoiceHandler) CreateVoiceChannel(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	// Verify membership and permission
	if !h.canManageChannels(c, serverID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to create channels",
		))
	}

	var req dto.CreateVoiceChannelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if req.Name == "" || len(req.Name) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"INVALID_NAME",
			"Channel name is required and must be less than 100 characters",
		))
	}

	channelType := channel.TypeVoice
	if req.Type == "video" {
		channelType = channel.TypeVideo
	} else if req.Type == "stage" {
		channelType = channel.TypeStage
	} else if req.Type == "hybrid" {
		channelType = channel.TypeHybrid
	}

	now := time.Now()
	channelID := generateVoiceChannelID()
	roomName := channelID

	newChannel := &channel.Channel{
		ID:          channelID,
		ServerID:    serverID,
		Name:        req.Name,
		Type:        channelType,
		Position:    req.Position,
		UserLimit:   req.UserLimit,
		Bitrate:     64,
		LiveKitRoom: roomName,
		ParentID:    req.ParentID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.channelRepo.Create(c.Context(), newChannel); err != nil {
		slog.Error("create voice channel error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to create voice channel",
		))
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": voiceChannelToDTO(newChannel),
	})
}

// DeleteVoiceChannel deletes a voice channel.
// DELETE /voice-channels/:id
func (h *VoiceHandler) DeleteVoiceChannel(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	channelID := c.Params("id")

	channel, err := h.channelRepo.FindByID(c.Context(), channelID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Verify permission
	if !h.canManageChannels(c, channel.ServerID, userID) {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to delete channels",
		))
	}

	// Delete LiveKit room if exists
	if h.livekit != nil && channel.LiveKitRoom != "" {
		if err := h.livekit.DeleteRoom(c.Context(), channel.LiveKitRoom); err != nil {
			slog.Warn("delete livekit room error", slog.Any("error", err))
		}
	}

	if err := h.channelRepo.Delete(c.Context(), channelID); err != nil {
		slog.Error("delete voice channel error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to delete voice channel",
		))
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// GetVoiceToken generates a LiveKit token for joining a voice channel.
// POST /voice-channels/:id/token
func (h *VoiceHandler) GetVoiceToken(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	channelID := c.Params("id")

	channel, err := h.channelRepo.FindByID(c.Context(), channelID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Verify membership
	_, err = h.memberRepo.FindByServerAndUser(c.Context(), channel.ServerID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a server member",
		))
	}

	// Check user limit
	if channel.UserLimit > 0 && channel.ParticipantCount >= channel.UserLimit {
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"CHANNEL_FULL",
			"Voice channel is full",
		))
	}

	if h.livekit == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(dto.NewErrorResponse(
			"SERVICE_UNAVAILABLE",
			"Voice service is not available",
		))
	}

	// Check for timeout
	member, err := h.memberRepo.FindByServerAndUser(c.Context(), channel.ServerID, userID)
	if err != nil {
		slog.Error("find member error", slog.Any("error", err))
		// Continue but assume no timeout check possible - or fail? Failing is safer.
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to verify member status",
		))
	}

	canPublish := true
	if member.IsTimedOut() {
		canPublish = false
	}

	// Fetch user for metadata
	u, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		slog.Error("find user error", slog.Any("error", err), slog.String("userId", userID))
		// Continue with empty metadata or handle error
	}

	metadata := ""
	if u != nil {
		// Embed basic user info as JSON in metadata
		metadata = fmt.Sprintf(`{"displayName":"%s","avatarGradient":["%s","%s"],"handle":"%s"}`,
			u.DisplayName, u.AvatarGradient[0], u.AvatarGradient[1], u.Handle)
	}

	// Generate token
	token, err := h.livekit.GenerateToken(userID, channel.LiveKitRoom, metadata, canPublish, true, 24*time.Hour)
	if err != nil {
		slog.Error("generate token error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to generate token",
		))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"token":    token,
			"roomName": channel.LiveKitRoom,
			"channel":  voiceChannelToDTO(channel),
		},
	})
}

// GetChannelParticipants returns participants in a voice channel.
// GET /voice-channels/:id/participants
func (h *VoiceHandler) GetChannelParticipants(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	channelID := c.Params("id")

	channel, err := h.channelRepo.FindByID(c.Context(), channelID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Verify membership
	_, err = h.memberRepo.FindByServerAndUser(c.Context(), channel.ServerID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"Not a server member",
		))
	}

	// Get participants from LiveKit
	if h.livekit != nil && channel.LiveKitRoom != "" {
		participants, err := h.livekit.ListParticipants(c.Context(), channel.LiveKitRoom)
		if err != nil {
			slog.Error("list participants error", slog.Any("error", err))
		} else {
			result := make([]fiber.Map, len(participants))
			for i, p := range participants {
				result[i] = fiber.Map{
					"identity":   p.Identity,
					"sid":        p.Sid,
					"state":      p.State.String(),
					"joinedAt":   p.JoinedAt,
					"isSpeaking": false,
				}
			}
			return c.JSON(fiber.Map{"data": result})
		}
	}

	return c.JSON(fiber.Map{"data": []fiber.Map{}})
}

// canManageChannels checks if user can manage channels
func (h *VoiceHandler) canManageChannels(c *fiber.Ctx, serverID, userID string) bool {
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

	return member.HasPermission(server.PermissionManageChannels)
}

func (h *VoiceHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, channel.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Voice channel not found",
		))
	default:
		slog.Error("voice handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func voiceChannelToDTO(ch *channel.Channel) dto.VoiceChannelResponse {
	return dto.VoiceChannelResponse{
		ID:               ch.ID,
		ServerID:         ch.ServerID,
		Name:             ch.Name,
		Type:             string(ch.Type),
		Position:         ch.Position,
		UserLimit:        ch.UserLimit,
		ParticipantCount: ch.ParticipantCount,
		CreatedAt:        ch.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}
}

func generateVoiceChannelID() string {
	id := uuid.New().String()
	clean := id[:8] + id[9:13] + id[14:18] + id[19:23] + id[24:36]
	return "vc_" + clean[:19]
}
