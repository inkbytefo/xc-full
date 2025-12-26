package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"xcord/internal/config"
)

func TestJWTService_GenerateAndValidateAccessToken(t *testing.T) {
	cfg := &config.JWTConfig{
		PrivateKeyPath:       "./testdata/jwt_private.pem",
		PublicKeyPath:        "./testdata/jwt_public.pem",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 168 * time.Hour,
	}

	service, err := NewJWTService(cfg)
	require.NoError(t, err)

	userID := "user_12345678"

	// Generate access token
	token, err := service.GenerateAccessToken(userID)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate token
	claims, err := service.ValidateAccessToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.Subject)
	assert.Equal(t, AccessToken, claims.TokenType)
}

func TestJWTService_GenerateAndValidateRefreshToken(t *testing.T) {
	cfg := &config.JWTConfig{
		PrivateKeyPath:       "./testdata/jwt_private.pem",
		PublicKeyPath:        "./testdata/jwt_public.pem",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 168 * time.Hour,
	}

	service, err := NewJWTService(cfg)
	require.NoError(t, err)

	userID := "user_87654321"

	// Generate refresh token
	token, err := service.GenerateRefreshToken(userID)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate token
	claims, err := service.ValidateRefreshToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.Subject)
	assert.Equal(t, RefreshToken, claims.TokenType)
}

func TestJWTService_RejectsRefreshTokenAsAccessToken(t *testing.T) {
	cfg := &config.JWTConfig{
		PrivateKeyPath:       "./testdata/jwt_private.pem",
		PublicKeyPath:        "./testdata/jwt_public.pem",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 168 * time.Hour,
	}

	service, err := NewJWTService(cfg)
	require.NoError(t, err)

	token, err := service.GenerateRefreshToken("user_12345678")
	require.NoError(t, err)

	_, err = service.ValidateAccessToken(token)
	assert.Error(t, err)
}

func TestJWTService_RejectsAccessTokenAsRefreshToken(t *testing.T) {
	cfg := &config.JWTConfig{
		PrivateKeyPath:       "./testdata/jwt_private.pem",
		PublicKeyPath:        "./testdata/jwt_public.pem",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 168 * time.Hour,
	}

	service, err := NewJWTService(cfg)
	require.NoError(t, err)

	token, err := service.GenerateAccessToken("user_87654321")
	require.NoError(t, err)

	_, err = service.ValidateRefreshToken(token)
	assert.Error(t, err)
}

func TestJWTService_InvalidToken(t *testing.T) {
	cfg := &config.JWTConfig{
		PrivateKeyPath:       "./testdata/jwt_private.pem",
		PublicKeyPath:        "./testdata/jwt_public.pem",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 168 * time.Hour,
	}

	service, err := NewJWTService(cfg)
	require.NoError(t, err)

	// Invalid token
	_, err = service.ValidateToken("invalid.token.here")
	assert.Error(t, err)
}

func TestJWTService_TokenDurations(t *testing.T) {
	cfg := &config.JWTConfig{
		PrivateKeyPath:       "./testdata/jwt_private.pem",
		PublicKeyPath:        "./testdata/jwt_public.pem",
		AccessTokenDuration:  30 * time.Minute,
		RefreshTokenDuration: 72 * time.Hour,
	}

	service, err := NewJWTService(cfg)
	require.NoError(t, err)

	assert.Equal(t, 30*time.Minute, service.GetAccessTokenDuration())
	assert.Equal(t, 72*time.Hour, service.GetRefreshTokenDuration())
}
