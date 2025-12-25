package handlers

import (
	"errors"
	"log/slog"

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

	srv, err := h.serverService.Create(c.Context(), serverApp.CreateCommand{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
		IsPublic:    req.IsPublic,
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

	if err := h.serverService.Join(c.Context(), serverID, userID); err != nil {
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

		resp := dto.MemberWithUserResponse{
			ID:       m.ID,
			UserID:   m.UserID,
			Role:     displayRole,
			JoinedAt: m.JoinedAt.Format("2006-01-02T15:04:05.000Z"),
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

func serverToDTOWithRole(s *server.Server, role string) dto.ServerResponse {
	return dto.ServerResponse{
		ID:           s.ID,
		Name:         s.Name,
		Description:  s.Description,
		IconGradient: s.IconGradient,
		MemberCount:  s.MemberCount,
		OwnerID:      s.OwnerID,
		IsPublic:     s.IsPublic,
		MyRole:       role,
		CreatedAt:    s.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
	}
}
