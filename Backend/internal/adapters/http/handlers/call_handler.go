package handlers

import (
	"log/slog"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"xcord/internal/domain/user"
	"xcord/internal/domain/ws"
)

// CallHandler handles voice/video call signaling.
type CallHandler struct {
	wsHandler   *WebSocketHandler
	userRepo    user.Repository
	activeCalls sync.Map // map[callID]*activeCall
}

type activeCall struct {
	ID           string
	CallerID     string
	CallerName   string
	CallerAvatar string
	CalleeID     string
	CalleeName   string
	CallType     string // "voice" | "video"
	RoomName     string
	CreatedAt    time.Time
	Status       string // "ringing" | "accepted" | "rejected" | "ended" | "missed"
}

// NewCallHandler creates a new CallHandler.
func NewCallHandler(wsHandler *WebSocketHandler, userRepo user.Repository) *CallHandler {
	h := &CallHandler{
		wsHandler: wsHandler,
		userRepo:  userRepo,
	}
	// Start cleanup goroutine for missed calls
	go h.cleanupMissedCalls()
	return h
}

// InitiateCall starts a new call to another user.
// POST /api/v1/calls/initiate
func (h *CallHandler) InitiateCall(c *fiber.Ctx) error {
	callerID := c.Locals("userID").(string)

	var req struct {
		CalleeID string `json:"calleeId"`
		CallType string `json:"callType"` // "voice" | "video"
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	if req.CalleeID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Callee ID is required")
	}

	if req.CallType != "voice" && req.CallType != "video" {
		req.CallType = "voice"
	}

	// Get caller info
	caller, err := h.userRepo.FindByID(c.Context(), callerID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to get caller info")
	}

	// Get callee info
	callee, err := h.userRepo.FindByID(c.Context(), req.CalleeID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "User not found")
	}

	// Create call
	callID := uuid.New().String()
	roomName := "call-" + callID

	call := &activeCall{
		ID:           callID,
		CallerID:     callerID,
		CallerName:   caller.DisplayName,
		CallerAvatar: caller.AvatarURL,
		CalleeID:     req.CalleeID,
		CalleeName:   callee.DisplayName,
		CallType:     req.CallType,
		RoomName:     roomName,
		CreatedAt:    time.Now(),
		Status:       "ringing",
	}

	h.activeCalls.Store(callID, call)

	// Send call_incoming to callee
	callData := ws.CallEventData{
		CallID:       callID,
		CallerID:     callerID,
		CallerName:   caller.DisplayName,
		CallerAvatar: caller.AvatarURL,
		CalleeID:     req.CalleeID,
		CalleeName:   callee.DisplayName,
		CallType:     req.CallType,
		RoomName:     roomName,
	}

	h.wsHandler.BroadcastToUser(req.CalleeID, ws.EventCallIncoming, callData)

	slog.Info("Call initiated",
		slog.String("callId", callID),
		slog.String("caller", callerID),
		slog.String("callee", req.CalleeID),
	)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"callId":   callID,
			"roomName": roomName,
		},
	})
}

// AcceptCall accepts an incoming call.
// POST /api/v1/calls/:callId/accept
func (h *CallHandler) AcceptCall(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	callID := c.Params("callId")

	val, ok := h.activeCalls.Load(callID)
	if !ok {
		return fiber.NewError(fiber.StatusNotFound, "Call not found")
	}

	call := val.(*activeCall)

	// Only callee can accept
	if call.CalleeID != userID {
		return fiber.NewError(fiber.StatusForbidden, "Not authorized to accept this call")
	}

	if call.Status != "ringing" {
		return fiber.NewError(fiber.StatusBadRequest, "Call is not ringing")
	}

	call.Status = "accepted"
	h.activeCalls.Store(callID, call)

	// Send call_accepted to caller
	callData := ws.CallEventData{
		CallID:       call.ID,
		CallerID:     call.CallerID,
		CallerName:   call.CallerName,
		CallerAvatar: call.CallerAvatar,
		CalleeID:     call.CalleeID,
		CalleeName:   call.CalleeName,
		CallType:     call.CallType,
		RoomName:     call.RoomName,
	}

	h.wsHandler.BroadcastToUser(call.CallerID, ws.EventCallAccepted, callData)

	slog.Info("Call accepted", slog.String("callId", callID))

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"callId":   callID,
			"roomName": call.RoomName,
		},
	})
}

// RejectCall rejects an incoming call.
// POST /api/v1/calls/:callId/reject
func (h *CallHandler) RejectCall(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	callID := c.Params("callId")

	val, ok := h.activeCalls.Load(callID)
	if !ok {
		return fiber.NewError(fiber.StatusNotFound, "Call not found")
	}

	call := val.(*activeCall)

	// Only callee can reject
	if call.CalleeID != userID {
		return fiber.NewError(fiber.StatusForbidden, "Not authorized to reject this call")
	}

	if call.Status != "ringing" {
		return fiber.NewError(fiber.StatusBadRequest, "Call is not ringing")
	}

	call.Status = "rejected"
	h.activeCalls.Delete(callID)

	// Send call_rejected to caller
	callData := ws.CallEventData{
		CallID:     call.ID,
		CallerID:   call.CallerID,
		CallerName: call.CallerName,
		CalleeID:   call.CalleeID,
		CalleeName: call.CalleeName,
		CallType:   call.CallType,
	}

	h.wsHandler.BroadcastToUser(call.CallerID, ws.EventCallRejected, callData)

	slog.Info("Call rejected", slog.String("callId", callID))

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// EndCall ends an active call.
// POST /api/v1/calls/:callId/end
func (h *CallHandler) EndCall(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	callID := c.Params("callId")

	val, ok := h.activeCalls.Load(callID)
	if !ok {
		return fiber.NewError(fiber.StatusNotFound, "Call not found or already ended")
	}

	call := val.(*activeCall)

	// Either caller or callee can end
	if call.CallerID != userID && call.CalleeID != userID {
		return fiber.NewError(fiber.StatusForbidden, "Not authorized to end this call")
	}

	call.Status = "ended"
	h.activeCalls.Delete(callID)

	// Send call_ended to the other party
	callData := ws.CallEventData{
		CallID:     call.ID,
		CallerID:   call.CallerID,
		CallerName: call.CallerName,
		CalleeID:   call.CalleeID,
		CalleeName: call.CalleeName,
		CallType:   call.CallType,
	}

	otherUserID := call.CalleeID
	if userID == call.CalleeID {
		otherUserID = call.CallerID
	}

	h.wsHandler.BroadcastToUser(otherUserID, ws.EventCallEnded, callData)

	slog.Info("Call ended", slog.String("callId", callID))

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// CancelCall cancels an outgoing call before it's answered.
// POST /api/v1/calls/:callId/cancel
func (h *CallHandler) CancelCall(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	callID := c.Params("callId")

	val, ok := h.activeCalls.Load(callID)
	if !ok {
		return fiber.NewError(fiber.StatusNotFound, "Call not found")
	}

	call := val.(*activeCall)

	// Only caller can cancel
	if call.CallerID != userID {
		return fiber.NewError(fiber.StatusForbidden, "Not authorized to cancel this call")
	}

	if call.Status != "ringing" {
		return fiber.NewError(fiber.StatusBadRequest, "Call is not ringing")
	}

	call.Status = "ended"
	h.activeCalls.Delete(callID)

	// Send call_ended to callee
	callData := ws.CallEventData{
		CallID:     call.ID,
		CallerID:   call.CallerID,
		CallerName: call.CallerName,
		CalleeID:   call.CalleeID,
		CalleeName: call.CalleeName,
		CallType:   call.CallType,
	}

	h.wsHandler.BroadcastToUser(call.CalleeID, ws.EventCallEnded, callData)

	slog.Info("Call cancelled", slog.String("callId", callID))

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// cleanupMissedCalls checks for unanswered calls and marks them as missed.
func (h *CallHandler) cleanupMissedCalls() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		h.activeCalls.Range(func(key, value interface{}) bool {
			call := value.(*activeCall)

			// If ringing for more than 30 seconds, mark as missed
			if call.Status == "ringing" && now.Sub(call.CreatedAt) > 30*time.Second {
				call.Status = "missed"
				h.activeCalls.Delete(key)

				// Send call_missed to caller
				callData := ws.CallEventData{
					CallID:     call.ID,
					CallerID:   call.CallerID,
					CallerName: call.CallerName,
					CalleeID:   call.CalleeID,
					CalleeName: call.CalleeName,
					CallType:   call.CallType,
				}

				h.wsHandler.BroadcastToUser(call.CallerID, ws.EventCallMissed, callData)

				// Also notify callee about missed call
				h.wsHandler.BroadcastToUser(call.CalleeID, ws.EventCallMissed, callData)

				slog.Info("Call missed", slog.String("callId", call.ID))
			}

			return true
		})
	}
}
