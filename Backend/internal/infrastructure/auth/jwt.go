package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"pink/internal/config"
	"pink/internal/domain/user"
)

// JWT errors
var (
	ErrInvalidToken         = errors.New("invalid token")
	ErrTokenExpired         = errors.New("token expired")
	ErrInvalidSigningMethod = errors.New("invalid signing method")
)

// TokenType represents the type of token.
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims represents JWT claims.
type Claims struct {
	jwt.RegisteredClaims
	TokenType TokenType `json:"type,omitempty"`
}

// JWTService provides JWT token generation and validation.
type JWTService struct {
	privateKey           *rsa.PrivateKey
	publicKey            *rsa.PublicKey
	accessTokenDuration  time.Duration
	refreshTokenDuration time.Duration
	issuer               string
	audience             string
}

// NewJWTService creates a new JWTService.
func NewJWTService(cfg *config.JWTConfig) (*JWTService, error) {
	// Load or generate keys
	privateKey, publicKey, err := loadOrGenerateKeys(cfg.PrivateKeyPath, cfg.PublicKeyPath)
	if err != nil {
		return nil, fmt.Errorf("load keys: %w", err)
	}

	return &JWTService{
		privateKey:           privateKey,
		publicKey:            publicKey,
		accessTokenDuration:  cfg.AccessTokenDuration,
		refreshTokenDuration: cfg.RefreshTokenDuration,
		issuer:               "pink-auth",
		audience:             "pink-api",
	}, nil
}

// GenerateAccessToken generates a new access token for a user.
func (s *JWTService) GenerateAccessToken(userID string) (string, error) {
	now := time.Now()

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTokenDuration)),
			Audience:  jwt.ClaimStrings{s.audience},
			Issuer:    s.issuer,
			ID:        generateTokenID(),
		},
		TokenType: AccessToken,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(s.privateKey)
}

// GenerateRefreshToken generates a new refresh token for a user.
func (s *JWTService) GenerateRefreshToken(userID string) (string, error) {
	now := time.Now()

	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTokenDuration)),
			Audience:  jwt.ClaimStrings{s.audience},
			Issuer:    s.issuer,
			ID:        generateTokenID(),
		},
		TokenType: RefreshToken,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(s.privateKey)
}

// ValidateToken validates a token and returns its claims.
func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, ErrInvalidSigningMethod
		}
		return s.publicKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, user.ErrSessionExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.Subject == "" {
		return nil, ErrInvalidToken
	}
	if claims.Issuer != s.issuer {
		return nil, ErrInvalidToken
	}
	if !containsString([]string(claims.Audience), s.audience) {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (s *JWTService) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != AccessToken {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func (s *JWTService) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != RefreshToken {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// GetAccessTokenDuration returns the access token duration.
func (s *JWTService) GetAccessTokenDuration() time.Duration {
	return s.accessTokenDuration
}

// GetRefreshTokenDuration returns the refresh token duration.
func (s *JWTService) GetRefreshTokenDuration() time.Duration {
	return s.refreshTokenDuration
}

// loadOrGenerateKeys loads RSA keys from files or generates new ones.
func loadOrGenerateKeys(privatePath, publicPath string) (*rsa.PrivateKey, *rsa.PublicKey, error) {
	// Try to load existing keys
	privateKey, err := loadPrivateKey(privatePath)
	if err == nil {
		publicKey, err := loadPublicKey(publicPath)
		if err == nil {
			return privateKey, publicKey, nil
		}
		// If public key doesn't exist, derive from private
		return privateKey, &privateKey.PublicKey, nil
	}

	// Generate new keys
	privateKey, err = rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		return nil, nil, fmt.Errorf("generate private key: %w", err)
	}

	// Try to save keys (ignore errors in development)
	_ = savePrivateKey(privatePath, privateKey)
	_ = savePublicKey(publicPath, &privateKey.PublicKey)

	return privateKey, &privateKey.PublicKey, nil
}

func loadPrivateKey(path string) (*rsa.PrivateKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(data)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}

	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

func loadPublicKey(path string) (*rsa.PublicKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(data)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("not an RSA public key")
	}

	return rsaPub, nil
}

func savePrivateKey(path string, key *rsa.PrivateKey) error {
	// Create directory if needed
	if err := os.MkdirAll("keys", 0700); err != nil {
		return err
	}

	data := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	})

	return os.WriteFile(path, data, 0600)
}

func savePublicKey(path string, key *rsa.PublicKey) error {
	data, err := x509.MarshalPKIXPublicKey(key)
	if err != nil {
		return err
	}

	pemData := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: data,
	})

	return os.WriteFile(path, pemData, 0644)
}

func generateTokenID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return uuid.NewString()
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func containsString(values []string, value string) bool {
	for _, v := range values {
		if v == value {
			return true
		}
	}
	return false
}
