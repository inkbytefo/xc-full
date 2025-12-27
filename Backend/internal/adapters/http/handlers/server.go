package handlers

import (
	"errors"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	serverApp "xcord/internal/application/server"
	"xcord/internal/domain/server"
	"xcord/internal/domain/user"
)

// ServerHandler handles server-related requests.
type ServerHandler struct {
	serverService *serverApp.Service
	userRepo      user.Repository
}

// NewServerHandler creates a new ServerHandler.
func NewServerHandler(serverService *serverApp.Service, userRepo user.Repository) *ServerHandler {
	return &ServerHandler{serverService: serverService, userRepo: userRepo}
}

// List returns all servers the user is a member of.
// GET /servers
func (h *ServerHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	servers, err := h.serverService.ListByUser(c.Context(), userID)
	if err != nil {
		slog.Error("list servers error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to list servers",
		))
	}

	response := make([]dto.ServerResponse, len(servers))
	for i, s := range servers {
		response[i] = serverToDTO(s)
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// Create creates a new server.
// POST /servers
func (h *ServerHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req dto.CreateServerRequest
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

	// Generate icon gradient from accent color (creates primary + darker secondary)
	var iconGradient [2]string
	if req.Accent != "" {
		iconGradient = [2]string{req.Accent, req.Accent + "99"} // Primary + slightly transparent
	}

	srv, err := h.serverService.Create(c.Context(), serverApp.CreateCommand{
		Name:         req.Name,
		Description:  req.Description,
		OwnerID:      userID,
		IsPublic:     req.IsPublic,
		IconGradient: iconGradient,
	})

	if err != nil {
		slog.Error("create server error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"Failed to create server",
		))
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": serverToDTO(srv),
	})
}

// Get returns a server by ID.
// GET /servers/:id
func (h *ServerHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	srv, err := h.serverService.GetByID(c.Context(), serverID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": serverToDTO(srv),
	})
}

// Update updates a server.
// PATCH /servers/:id
func (h *ServerHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	var req dto.UpdateServerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	srv, err := h.serverService.Update(c.Context(), serverApp.UpdateCommand{
		ID:          serverID,
		Name:        req.Name,
		Description: req.Description,
		IsPublic:    req.IsPublic,
		UserID:      userID,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": serverToDTO(srv),
	})
}

// Delete deletes a server.
// DELETE /servers/:id
func (h *ServerHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	if err := h.serverService.Delete(c.Context(), serverID, userID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// Join allows a user to join a server.
// POST /servers/:id/join
func (h *ServerHandler) Join(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	result, err := h.serverService.Join(c.Context(), serverID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	if result.Pending {
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"data": fiber.Map{
				"pending": true,
			},
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ListJoinRequests lists pending join requests for a server.
// GET /servers/:id/join-requests
func (h *ServerHandler) ListJoinRequests(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	requests, err := h.serverService.ListJoinRequests(c.Context(), serverID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	resp := make([]dto.JoinRequestResponse, len(requests))
	for i, r := range requests {
		resp[i] = dto.JoinRequestResponse{
			ServerID:  r.ServerID,
			UserID:    r.UserID,
			Status:    string(r.Status),
			Message:   r.Message,
			CreatedAt: r.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			UpdatedAt: r.UpdatedAt.Format("2006-01-02T15:04:05.000Z"),
		}
	}

	return c.JSON(fiber.Map{
		"data": resp,
	})
}

// AcceptJoinRequest accepts a pending join request.
// POST /servers/:id/join-requests/:userId/accept
func (h *ServerHandler) AcceptJoinRequest(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	if err := h.serverService.AcceptJoinRequest(c.Context(), serverID, targetUserID, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// RejectJoinRequest rejects a pending join request.
// POST /servers/:id/join-requests/:userId/reject
func (h *ServerHandler) RejectJoinRequest(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	if err := h.serverService.RejectJoinRequest(c.Context(), serverID, targetUserID, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// Leave allows a user to leave a server.
// POST /servers/:id/leave
func (h *ServerHandler) Leave(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	if err := h.serverService.Leave(c.Context(), serverID, userID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ListMembers lists all members of a server.
// GET /servers/:id/members
func (h *ServerHandler) ListMembers(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	members, err := h.serverService.ListMembers(c.Context(), serverID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Check if current user is owner for role assignment
	isOwner := h.serverService.IsOwner(c.Context(), serverID, userID)

	response := make([]dto.MemberWithUserResponse, len(members))
	for i, m := range members {
		// Determine display role based on ownership or highest role
		displayRole := "member"
		if isOwner && m.UserID == userID {
			displayRole = "owner"
		} else if len(m.Roles) > 0 {
			// Use highest position role name
			displayRole = m.Roles[0].Name
		}

		roleIDs := make([]string, len(m.Roles))
		for j, r := range m.Roles {
			roleIDs[j] = r.ID
		}

		resp := dto.MemberWithUserResponse{
			ID:       m.ID,
			UserID:   m.UserID,
			Role:     displayRole,
			JoinedAt: m.JoinedAt.Format("2006-01-02T15:04:05.000Z"),
			RoleIDs:  roleIDs,
		}

		// Fetch user data
		if h.userRepo != nil {
			if u, err := h.userRepo.FindByID(c.Context(), m.UserID); err == nil && u != nil {
				resp.User = &dto.PublicUserResponse{
					ID:             u.ID,
					Handle:         u.Handle,
					DisplayName:    u.DisplayName,
					AvatarGradient: u.AvatarGradient,
				}
			}
		}

		response[i] = resp
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// RemoveMember removes a member from a server.
// DELETE /servers/:id/members/:userId
func (h *ServerHandler) RemoveMember(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	if err := h.serverService.RemoveMember(c.Context(), serverID, targetUserID, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// Ban bans a member from the server.
// POST /servers/:id/bans
func (h *ServerHandler) Ban(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")

	var req dto.BanMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if req.UserID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"User ID is required",
		))
	}

	if err := h.serverService.BanMember(c.Context(), serverID, req.UserID, actorID, req.Reason); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// Unban removes a ban from a user.
// DELETE /servers/:id/bans/:userId
func (h *ServerHandler) Unban(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	if err := h.serverService.UnbanMember(c.Context(), serverID, targetUserID, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// GetBans returns all bans for a server.
// GET /servers/:id/bans
func (h *ServerHandler) GetBans(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")

	bans, err := h.serverService.GetBans(c.Context(), serverID, actorID)
	if err != nil {
		return h.handleError(c, err)
	}

	response := make([]dto.BanResponse, len(bans))
	for i, b := range bans {
		response[i] = dto.BanResponse{
			ID:        b.ID,
			UserID:    b.UserID,
			BannedBy:  b.BannedBy,
			Reason:    b.Reason,
			CreatedAt: b.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		}
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// Timeout times out a member.
// POST /servers/:id/members/:userId/timeout
func (h *ServerHandler) Timeout(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	var req dto.TimeoutMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if req.DurationSeconds <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Duration must be positive",
		))
	}

	duration := time.Duration(req.DurationSeconds) * time.Second

	if err := h.serverService.TimeoutMember(c.Context(), serverID, targetUserID, actorID, duration, req.Reason); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// RemoveTimeout removes a timeout from a member.
// DELETE /servers/:id/members/:userId/timeout
func (h *ServerHandler) RemoveTimeout(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	if err := h.serverService.RemoveTimeout(c.Context(), serverID, targetUserID, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ListRoles lists all roles in a server.
// GET /servers/:id/roles
func (h *ServerHandler) ListRoles(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	serverID := c.Params("id")

	roles, err := h.serverService.ListRoles(c.Context(), serverID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	response := make([]dto.RoleResponse, len(roles))
	for i, r := range roles {
		response[i] = dto.RoleResponse{
			ID:          r.ID,
			Name:        r.Name,
			Color:       r.Color,
			Position:    r.Position,
			Permissions: int64(r.Permissions),
			IsDefault:   r.IsDefault,
		}
	}

	return c.JSON(fiber.Map{
		"data": response,
	})
}

// CreateRole creates a new role.
// POST /servers/:id/roles
func (h *ServerHandler) CreateRole(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")

	var req dto.CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Role name is required",
		))
	}

	role, err := h.serverService.CreateRole(c.Context(), serverID, req.Name, req.Color, server.Permission(req.Permissions), actorID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": dto.RoleResponse{
			ID:          role.ID,
			Name:        role.Name,
			Color:       role.Color,
			Position:    role.Position,
			Permissions: int64(role.Permissions),
			IsDefault:   role.IsDefault,
		},
	})
}

// UpdateRole updates an existing role.
// PATCH /servers/:id/roles/:roleId
func (h *ServerHandler) UpdateRole(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	roleID := c.Params("roleId")

	var req dto.UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	var name, color string
	if req.Name != nil {
		name = *req.Name
	}
	if req.Color != nil {
		color = *req.Color
	}

	var perms *server.Permission
	if req.Permissions != nil {
		p := server.Permission(*req.Permissions)
		perms = &p
	}

	role, err := h.serverService.UpdateRole(c.Context(), serverID, roleID, name, color, perms, req.Position, actorID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": dto.RoleResponse{
			ID:          role.ID,
			Name:        role.Name,
			Color:       role.Color,
			Position:    role.Position,
			Permissions: int64(role.Permissions),
			IsDefault:   role.IsDefault,
		},
	})
}

// DeleteRole deletes a role.
// DELETE /servers/:id/roles/:roleId
func (h *ServerHandler) DeleteRole(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	roleID := c.Params("roleId")

	if err := h.serverService.DeleteRole(c.Context(), serverID, roleID, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// UpdateMemberRoles updates a member's roles.
// PUT /servers/:id/members/:userId/roles
func (h *ServerHandler) UpdateMemberRoles(c *fiber.Ctx) error {
	actorID := c.Locals("userID").(string)
	serverID := c.Params("id")
	targetUserID := c.Params("userId")

	var req dto.UpdateMemberRolesRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Invalid request body",
		))
	}

	if err := h.serverService.UpdateMemberRoles(c.Context(), serverID, targetUserID, req.RoleIDs, actorID); err != nil {
		return h.handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *ServerHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, server.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"NOT_FOUND",
			"Server not found",
		))

	case errors.Is(err, server.ErrAlreadyMember):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"ALREADY_MEMBER",
			"Already a member of this server",
		))

	case errors.Is(err, server.ErrNotMember):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"NOT_MEMBER",
			"Not a member of this server",
		))

	case errors.Is(err, server.ErrNoPermission):
		return c.Status(fiber.StatusForbidden).JSON(dto.NewErrorResponse(
			"FORBIDDEN",
			"No permission to perform this action",
		))

	case errors.Is(err, server.ErrOwnerCannotLeave):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"OWNER_CANNOT_LEAVE",
			"Server owner cannot leave. Transfer ownership or delete the server.",
		))

	case errors.Is(err, server.ErrJoinRequestNotFound):
		return c.Status(fiber.StatusNotFound).JSON(dto.NewErrorResponse(
			"JOIN_REQUEST_NOT_FOUND",
			"Join request not found",
		))

	default:
		slog.Error("server handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}

func serverToDTO(s *server.Server) dto.ServerResponse {
	return dto.ServerResponse{
		ID:           s.ID,
		Name:         s.Name,
		Description:  s.Description,
		IconGradient: s.IconGradient,
		MemberCount:  s.MemberCount,
		OwnerID:      s.OwnerID,
		IsPublic:     s.IsPublic,
		CreatedAt:    s.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}
}
