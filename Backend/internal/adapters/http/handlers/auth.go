// Package handlers provides HTTP request handlers.
package handlers

import (
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"

	"xcord/internal/adapters/http/dto"
	"xcord/internal/application/user"
	userDomain "xcord/internal/domain/user"
)

// AuthHandler handles authentication-related requests.
type AuthHandler struct {
	userService *user.Service
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(userService *user.Service) *AuthHandler {
	return &AuthHandler{userService: userService}
}

// Register handles user registration.
// POST /auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
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

	result, err := h.userService.Register(c.Context(), user.RegisterCommand{
		Handle:      req.Handle,
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Password:    req.Password,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	// Set cookies
	h.setTokenCookies(c, result.AccessToken, result.RefreshToken, result.ExpiresIn, result.RefreshTokenExpiresIn)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": dto.AuthResponse{
			User: dto.UserResponse{
				ID:             result.User.ID,
				Handle:         result.User.Handle,
				DisplayName:    result.User.DisplayName,
				AvatarGradient: result.User.AvatarGradient,
			},
			// Tokens are now in cookies, sending empty/partial info or omitted
			Tokens: dto.TokensResponse{
				ExpiresIn: result.ExpiresIn,
			},
		},
	})
}

// Login handles user login.
// POST /auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
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

	result, err := h.userService.Login(c.Context(), user.LoginCommand{
		Email:    req.Email,
		Password: req.Password,
	})

	if err != nil {
		return h.handleError(c, err)
	}

	// Set cookies
	h.setTokenCookies(c, result.AccessToken, result.RefreshToken, result.ExpiresIn, result.RefreshTokenExpiresIn)

	return c.JSON(fiber.Map{
		"data": dto.AuthResponse{
			User: dto.UserResponse{
				ID:             result.User.ID,
				Handle:         result.User.Handle,
				DisplayName:    result.User.DisplayName,
				Email:          result.User.Email,
				AvatarGradient: result.User.AvatarGradient,
				Bio:            result.User.Bio,
				IsVerified:     result.User.IsVerified,
			},
			Tokens: dto.TokensResponse{
				ExpiresIn: result.ExpiresIn,
			},
		},
	})
}

// Refresh handles token refresh.
// POST /auth/refresh
func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	// Try to get token from cookie first
	refreshToken := c.Cookies("refresh_token")

	// Fallback to body if not in cookie (for mobile/external apps)
	if refreshToken == "" {
		var req dto.RefreshRequest
		if err := c.BodyParser(&req); err == nil {
			refreshToken = req.RefreshToken
		}
	}

	if refreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"BAD_REQUEST",
			"Missing refresh token",
		))
	}

	result, err := h.userService.RefreshToken(c.Context(), refreshToken)
	if err != nil {
		// If refresh failed, clear cookies just in case
		h.clearCookies(c)
		return h.handleError(c, err)
	}

	// Set new cookies
	h.setTokenCookies(c, result.AccessToken, result.RefreshToken, result.ExpiresIn, result.RefreshTokenExpiresIn)

	return c.JSON(fiber.Map{
		"data": dto.RefreshResponse{
			ExpiresIn: result.ExpiresIn,
		},
	})
}

// Logout handles user logout.
// POST /auth/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")

	if refreshToken == "" {
		var req dto.LogoutRequest
		if err := c.BodyParser(&req); err == nil {
			refreshToken = req.RefreshToken
		}
	}

	if refreshToken != "" {
		if err := h.userService.Logout(c.Context(), refreshToken); err != nil {
			// Log but don't expose error
			slog.Warn("failed to logout session", slog.Any("error", err))
		}
	}

	h.clearCookies(c)

	return c.SendStatus(fiber.StatusNoContent)
}

// setTokenCookies sets the access and refresh tokens as HTTP-only cookies.
func (h *AuthHandler) setTokenCookies(c *fiber.Ctx, accessToken, refreshToken string, accessDuration, refreshDuration int64) {
	isProd := os.Getenv("ENV") == "production"

	// Access Token Cookie
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(time.Duration(accessDuration) * time.Second),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax", // Use Lax for better UX with external links, strict might kill session on deep links
		Path:     "/",
	})

	// Refresh Token Cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(time.Duration(refreshDuration) * time.Second),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/", // Must be available for refresh endpoint
	})
}

// clearCookies clears the auth cookies.
func (h *AuthHandler) clearCookies(c *fiber.Ctx) {
	isProd := os.Getenv("ENV") == "production"

	// Expire Access Token
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
	})

	// Expire Refresh Token
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
	})
}

// handleError maps domain errors to HTTP responses.
func (h *AuthHandler) handleError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, userDomain.ErrEmailAlreadyExists):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"EMAIL_EXISTS",
			"Email already registered",
		))

	case errors.Is(err, userDomain.ErrHandleAlreadyExists):
		return c.Status(fiber.StatusConflict).JSON(dto.NewErrorResponse(
			"HANDLE_EXISTS",
			"Handle already taken",
		))

	case errors.Is(err, userDomain.ErrInvalidPassword):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"INVALID_CREDENTIALS",
			"Invalid email or password",
		))

	case errors.Is(err, userDomain.ErrPasswordTooShort):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"PASSWORD_TOO_SHORT",
			"Password must be at least 8 characters",
		))

	case errors.Is(err, userDomain.ErrPasswordTooWeak):
		return c.Status(fiber.StatusBadRequest).JSON(dto.NewErrorResponse(
			"PASSWORD_TOO_WEAK",
			"Password must contain uppercase, lowercase, and number",
		))

	case errors.Is(err, userDomain.ErrSessionExpired):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"SESSION_EXPIRED",
			"Session has expired",
		))

	case errors.Is(err, userDomain.ErrSessionNotFound):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"INVALID_TOKEN",
			"Invalid refresh token",
		))

	case errors.Is(err, userDomain.ErrUnauthorized):
		return c.Status(fiber.StatusUnauthorized).JSON(dto.NewErrorResponse(
			"UNAUTHORIZED",
			"Account is disabled",
		))

	default:
		// Log the error for debugging
		slog.Error("auth handler error", slog.Any("error", err))
		return c.Status(fiber.StatusInternalServerError).JSON(dto.NewErrorResponse(
			"INTERNAL_ERROR",
			"An internal error occurred",
		))
	}
}
