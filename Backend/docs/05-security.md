# XCORD Backend - Security

> Versiyon: 1.0 | Tarih: 2025-12-21

---

## 📋 İçindekiler

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [API Security](#api-security)
4. [Data Security](#data-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Security Checklist](#security-checklist)

---

## Authentication

### JWT Implementation

#### Token Structure

```
Access Token (RS256):
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
│ {                                                           │
│   "alg": "RS256",                                          │
│   "typ": "JWT",                                            │
│   "kid": "key-2025-01"                                     │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ Payload                                                     │
│ {                                                           │
│   "sub": "user_abc123",                                    │
│   "iat": 1735776000,                                       │
│   "exp": 1735776900,        // 15 minutes                  │
│   "aud": "xcord-api",                                      │
│   "iss": "xcord-auth",                                     │
│   "jti": "unique-token-id"                                 │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ Signature                                                   │
│ RSASHA256(base64(header) + "." + base64(payload), key)     │
└─────────────────────────────────────────────────────────────┘
```

#### Token Lifetimes

| Token Type | Lifetime | Storage |
|------------|----------|---------|
| Access Token | 15 minutes | Memory only |
| Refresh Token | 7 days | HTTP-only cookie + DB |

#### Implementation

```go
// internal/infrastructure/auth/jwt.go
package auth

import (
    "crypto/rsa"
    "time"
    
    "github.com/golang-jwt/jwt/v5"
)

type JWTService struct {
    privateKey *rsa.PrivateKey
    publicKey  *rsa.PublicKey
    issuer     string
    audience   string
}

type Claims struct {
    jwt.RegisteredClaims
}

func (s *JWTService) GenerateAccessToken(userID string) (string, error) {
    now := time.Now()
    
    claims := Claims{
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   userID,
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
            Audience:  jwt.ClaimStrings{s.audience},
            Issuer:    s.issuer,
            ID:        generateTokenID(),
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    token.Header["kid"] = s.currentKeyID()
    
    return token.SignedString(s.privateKey)
}

func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method
        if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, ErrInvalidSigningMethod
        }
        return s.publicKey, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, ErrInvalidToken
    }
    
    return claims, nil
}
```

### Refresh Token Flow

```
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │  API   │                    │   DB   │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    │ POST /auth/login            │                             │
    │ {email, password}           │                             │
    │────────────────────────────>│                             │
    │                             │    Verify credentials       │
    │                             │────────────────────────────>│
    │                             │<────────────────────────────│
    │                             │                             │
    │                             │    Store refresh token      │
    │                             │────────────────────────────>│
    │                             │                             │
    │ {accessToken, refreshToken} │                             │
    │<────────────────────────────│                             │
    │                             │                             │
    │ ... 15 minutes later ...    │                             │
    │                             │                             │
    │ POST /auth/refresh          │                             │
    │ {refreshToken}              │                             │
    │────────────────────────────>│                             │
    │                             │    Validate refresh token   │
    │                             │────────────────────────────>│
    │                             │<────────────────────────────│
    │                             │                             │
    │                             │    Rotate refresh token     │
    │                             │────────────────────────────>│
    │                             │                             │
    │ {newAccessToken,            │                             │
    │  newRefreshToken}           │                             │
    │<────────────────────────────│                             │
```

### Password Security

```go
// internal/infrastructure/auth/password.go
package auth

import (
    "golang.org/x/crypto/bcrypt"
)

const (
    // bcrypt cost factor (12-14 recommended for 2025)
    bcryptCost = 13
)

type PasswordHasher struct{}

func (h *PasswordHasher) Hash(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    return string(bytes), err
}

func (h *PasswordHasher) Verify(password, hash string) error {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// Password validation rules
func ValidatePassword(password string) error {
    if len(password) < 8 {
        return ErrPasswordTooShort
    }
    if len(password) > 128 {
        return ErrPasswordTooLong
    }
    
    var (
        hasUpper   bool
        hasLower   bool
        hasNumber  bool
    )
    
    for _, c := range password {
        switch {
        case unicode.IsUpper(c):
            hasUpper = true
        case unicode.IsLower(c):
            hasLower = true
        case unicode.IsNumber(c):
            hasNumber = true
        }
    }
    
    if !hasUpper || !hasLower || !hasNumber {
        return ErrPasswordTooWeak
    }
    
    return nil
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

#### Server Roles & Permissions

```go
// internal/domain/server/permissions.go
package server

type Permission string

const (
    PermManageServer   Permission = "manage_server"
    PermManageChannels Permission = "manage_channels"
    PermManageMembers  Permission = "manage_members"
    PermKickMembers    Permission = "kick_members"
    PermBanMembers     Permission = "ban_members"
    PermSendMessages   Permission = "send_messages"
    PermManageMessages Permission = "manage_messages"
    PermMentionEveryone Permission = "mention_everyone"
    PermVoiceConnect   Permission = "voice_connect"
    PermVoiceSpeak     Permission = "voice_speak"
)

var rolePermissions = map[MemberRole][]Permission{
    RoleOwner: {
        PermManageServer, PermManageChannels, PermManageMembers,
        PermKickMembers, PermBanMembers, PermSendMessages,
        PermManageMessages, PermMentionEveryone, PermVoiceConnect,
        PermVoiceSpeak,
    },
    RoleAdmin: {
        PermManageChannels, PermManageMembers, PermKickMembers,
        PermBanMembers, PermSendMessages, PermManageMessages,
        PermMentionEveryone, PermVoiceConnect, PermVoiceSpeak,
    },
    RoleModerator: {
        PermKickMembers, PermSendMessages, PermManageMessages,
        PermVoiceConnect, PermVoiceSpeak,
    },
    RoleMember: {
        PermSendMessages, PermVoiceConnect, PermVoiceSpeak,
    },
}

func (r MemberRole) HasPermission(p Permission) bool {
    perms, ok := rolePermissions[r]
    if !ok {
        return false
    }
    for _, perm := range perms {
        if perm == p {
            return true
        }
    }
    return false
}
```

#### Authorization Middleware

```go
// internal/adapters/http/middleware/auth.go
package middleware

import (
    "github.com/gofiber/fiber/v2"
)

func RequireAuth(jwtService *auth.JWTService) fiber.Handler {
    return func(c *fiber.Ctx) error {
        token := extractBearerToken(c)
        if token == "" {
            return fiber.NewError(fiber.StatusUnauthorized, "missing token")
        }
        
        claims, err := jwtService.ValidateToken(token)
        if err != nil {
            if errors.Is(err, jwt.ErrTokenExpired) {
                return fiber.NewError(fiber.StatusUnauthorized, "token expired")
            }
            return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
        }
        
        c.Locals("userID", claims.Subject)
        return c.Next()
    }
}

func RequireServerRole(roles ...server.MemberRole) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        serverID := c.Params("serverId")
        
        member, err := getMember(c.Context(), serverID, userID)
        if err != nil {
            return fiber.NewError(fiber.StatusForbidden, "not a member")
        }
        
        for _, role := range roles {
            if member.Role == role {
                c.Locals("member", member)
                return c.Next()
            }
        }
        
        return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
    }
}

func RequirePermission(perm server.Permission) fiber.Handler {
    return func(c *fiber.Ctx) error {
        member := c.Locals("member").(*server.Member)
        
        if !member.Role.HasPermission(perm) {
            return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
        }
        
        return c.Next()
    }
}
```

---

## API Security

### Rate Limiting

```go
// internal/adapters/http/middleware/ratelimit.go
package middleware

import (
    "time"
    
    "github.com/gofiber/fiber/v2"
    "github.com/go-redis/redis/v9"
)

type RateLimiter struct {
    redis *redis.Client
}

type RateLimitConfig struct {
    Limit  int
    Window time.Duration
}

var defaultLimits = map[string]RateLimitConfig{
    "read":      {Limit: 120, Window: time.Minute},
    "write":     {Limit: 30, Window: time.Minute},
    "search":    {Limit: 30, Window: time.Minute},
    "live_chat": {Limit: 60, Window: time.Minute},
    "auth":      {Limit: 5, Window: time.Minute},
}

func (rl *RateLimiter) Limit(category string) fiber.Handler {
    config := defaultLimits[category]
    
    return func(c *fiber.Ctx) error {
        key := fmt.Sprintf("ratelimit:%s:%s", category, getClientID(c))
        
        count, err := rl.redis.Incr(c.Context(), key).Result()
        if err != nil {
            return c.Next() // Fail open
        }
        
        if count == 1 {
            rl.redis.Expire(c.Context(), key, config.Window)
        }
        
        remaining := config.Limit - int(count)
        if remaining < 0 {
            remaining = 0
        }
        
        ttl, _ := rl.redis.TTL(c.Context(), key).Result()
        
        c.Set("X-RateLimit-Limit", strconv.Itoa(config.Limit))
        c.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
        c.Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(ttl).Unix(), 10))
        
        if count > int64(config.Limit) {
            return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
                "error": fiber.Map{
                    "code":       "RATE_LIMITED",
                    "message":    "Too many requests",
                    "retryAfter": int(ttl.Seconds()),
                },
            })
        }
        
        return c.Next()
    }
}
```

### Input Validation

```go
// internal/adapters/http/dto/validation.go
package dto

import (
    "regexp"
    
    "github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
    validate = validator.New()
    
    // Custom validators
    validate.RegisterValidation("handle", validateHandle)
    validate.RegisterValidation("content", validateContent)
}

var handleRegex = regexp.MustCompile(`^[a-z0-9_]{3,20}$`)

func validateHandle(fl validator.FieldLevel) bool {
    return handleRegex.MatchString(fl.Field().String())
}

func validateContent(fl validator.FieldLevel) bool {
    content := fl.Field().String()
    return len(content) >= 1 && len(content) <= 2800
}

// Request DTOs with validation
type CreateUserRequest struct {
    Handle      string `json:"handle" validate:"required,handle"`
    DisplayName string `json:"displayName" validate:"required,min=1,max=50"`
    Email       string `json:"email" validate:"required,email"`
    Password    string `json:"password" validate:"required,min=8,max=128"`
}

func (r *CreateUserRequest) Validate() error {
    return validate.Struct(r)
}

type CreatePostRequest struct {
    Text       string `json:"text" validate:"required,content"`
    Visibility string `json:"visibility" validate:"required,oneof=public friends servers"`
    ServerID   string `json:"serverId,omitempty" validate:"omitempty,len=26"`
}
```

### SQL Injection Prevention

```go
// Always use parameterized queries
// ❌ Wrong
query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", userID)

// ✅ Correct
query := "SELECT * FROM users WHERE id = $1"
row := pool.QueryRow(ctx, query, userID)
```

### XSS Prevention

```go
// Sanitize user content before storage
import "github.com/microcosm-cc/bluemonday"

var policy = bluemonday.UGCPolicy()

func SanitizeContent(content string) string {
    return policy.Sanitize(content)
}
```

### CORS Configuration

```go
// internal/adapters/http/middleware/cors.go
package middleware

import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
)

func CORS(allowedOrigins []string) fiber.Handler {
    return cors.New(cors.Config{
        AllowOrigins:     strings.Join(allowedOrigins, ","),
        AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID,X-Client-ID",
        AllowCredentials: true,
        ExposeHeaders:    "X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset",
        MaxAge:           86400, // 24 hours
    })
}
```

---

## Data Security

### Encryption at Rest

```yaml
# PostgreSQL with TDE (Transparent Data Encryption)
# Or use encrypted storage volumes

# Redis encryption
# Use Redis 7+ with TLS
redis:
  tls:
    enabled: true
    cert_file: /path/to/redis.crt
    key_file: /path/to/redis.key
```

### Encryption in Transit

```go
// TLS configuration
import "crypto/tls"

func NewTLSConfig() *tls.Config {
    return &tls.Config{
        MinVersion: tls.VersionTLS12,
        PreferServerCipherSuites: true,
        CurvePreferences: []tls.CurveID{
            tls.X25519,
            tls.CurveP256,
        },
        CipherSuites: []uint16{
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
        },
    }
}
```

### Sensitive Data Handling

```go
// Never log sensitive data
type User struct {
    ID           string `json:"id"`
    Email        string `json:"email"`
    PasswordHash string `json:"-"` // Exclude from JSON
}

// Mask sensitive data in logs
func (u *User) LogValue() slog.Value {
    return slog.GroupValue(
        slog.String("id", u.ID),
        slog.String("email", maskEmail(u.Email)),
    )
}

func maskEmail(email string) string {
    parts := strings.Split(email, "@")
    if len(parts) != 2 {
        return "***"
    }
    return parts[0][:2] + "***@" + parts[1]
}
```

---

## Infrastructure Security

### Environment Variables

```bash
# Never hardcode secrets
# Use environment variables or secret managers

# Required environment variables
DATABASE_URL=postgres://user:pass@host:5432/xcord?sslmode=require
REDIS_URL=rediss://user:pass@host:6379
JWT_PRIVATE_KEY_PATH=/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt_public.pem

# For production, use secret managers:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Google Secret Manager
```

### Docker Security

```dockerfile
# Dockerfile
FROM golang:1.23-alpine AS builder

# Don't run as root
RUN adduser -D -g '' appuser

WORKDIR /app
COPY . .
RUN go build -o /app/api ./cmd/api

FROM alpine:3.19
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /app/api /app/api

USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/api"]
```

### Security Headers

```go
// internal/adapters/http/middleware/security.go
package middleware

import "github.com/gofiber/fiber/v2"

func SecurityHeaders() fiber.Handler {
    return func(c *fiber.Ctx) error {
        c.Set("X-Content-Type-Options", "nosniff")
        c.Set("X-Frame-Options", "DENY")
        c.Set("X-XSS-Protection", "1; mode=block")
        c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Set("Content-Security-Policy", "default-src 'self'")
        c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        
        return c.Next()
    }
}
```

---

## Security Checklist

### Development

- [ ] Input validation on all endpoints
- [ ] Parameterized SQL queries
- [ ] Password hashing with bcrypt (cost 13+)
- [ ] JWT with RS256 algorithm
- [ ] Short-lived access tokens (15 min)
- [ ] Refresh token rotation
- [ ] Rate limiting on all endpoints
- [ ] CORS properly configured
- [ ] No sensitive data in logs

### Deployment

- [ ] HTTPS everywhere (TLS 1.2+)
- [ ] Environment variables for secrets
- [ ] Non-root container user
- [ ] Security headers enabled
- [ ] Database encryption at rest
- [ ] Redis TLS enabled
- [ ] Network segmentation
- [ ] Regular dependency updates

### Monitoring

- [ ] Authentication failures logged
- [ ] Rate limit hits tracked
- [ ] Suspicious activity alerts
- [ ] Error tracking (Sentry)
- [ ] Security audit logs

---

*Sonraki: [Real-time](./06-real-time.md)*
