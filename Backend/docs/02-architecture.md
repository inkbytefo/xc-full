# XCORD Backend - Mimari Tasarım

> Versiyon: 1.0 | Tarih: 2025-12-21

---

## 📋 İçindekiler

1. [Mimari Genel Bakış](#mimari-genel-bakış)
2. [Proje Yapısı](#proje-yapısı)
3. [Katman Detayları](#katman-detayları)
4. [Module Yapısı](#module-yapısı)
5. [Bağımlılık Yönetimi](#bağımlılık-yönetimi)
6. [Tasarım Desenleri](#tasarım-desenleri)

---

## Mimari Genel Bakış

### High-Level Architecture

```
                              ┌─────────────────┐
                              │   Load Balancer │
                              │   (nginx/Caddy) │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
           ┌────────▼────────┐ ┌───────▼───────┐ ┌───────▼───────┐
           │   API Server 1  │ │  API Server 2 │ │  API Server N │
           │   (Go/Fiber)    │ │  (Go/Fiber)   │ │  (Go/Fiber)   │
           └────────┬────────┘ └───────┬───────┘ └───────┬───────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
        ┌──────────────────────────────┼─────────────────────────────┐
        │                              │                             │
┌───────▼───────┐            ┌─────────▼─────────┐         ┌────────▼────────┐
│  PostgreSQL   │            │      Redis        │         │   S3/MinIO      │
│  (Primary DB) │            │  (Cache/PubSub)   │         │ (Media Storage) │
└───────────────┘            └───────────────────┘         └─────────────────┘
```

### Microservices vs Modular Monolith

**Karar:** İlk aşamada **Modular Monolith** yaklaşımı kullanılacak.

| Yaklaşım | Avantaj | Dezavantaj |
|----------|---------|------------|
| **Modular Monolith** ✅ | Basit deployment, düşük latency | Tek binary, scaling sınırlı |
| Microservices | Bağımsız scaling, teknoloji çeşitliliği | Karmaşık, network overhead |

**Gerekçe:**
- MVP için hızlı geliştirme
- Modüller arası net sınırlar
- Gerektiğinde microservices'e geçiş kolay
- Team size küçük

---

## Proje Yapısı

### Dizin Düzeni

```
Backend/
├── cmd/                         # Uygulamanın giriş noktaları
│   ├── api/                     # HTTP API server
│   │   └── main.go
│   ├── worker/                  # Background job worker
│   │   └── main.go
│   └── migrate/                 # Database migration tool
│       └── main.go
│
├── internal/                    # Private application code
│   ├── domain/                  # Domain Layer (Entity, Value Objects)
│   │   ├── user/
│   │   │   ├── entity.go        # User entity
│   │   │   ├── repository.go    # Repository interface
│   │   │   └── errors.go        # Domain errors
│   │   ├── post/
│   │   ├── server/
│   │   ├── channel/
│   │   ├── message/
│   │   └── live/
│   │
│   ├── application/             # Application Layer (Use Cases)
│   │   ├── user/
│   │   │   ├── service.go       # User service
│   │   │   ├── commands.go      # Create, Update, Delete
│   │   │   └── queries.go       # Find, List
│   │   ├── post/
│   │   ├── server/
│   │   ├── channel/
│   │   ├── message/
│   │   └── live/
│   │
│   ├── adapters/                # Adapters Layer (Ports)
│   │   ├── http/                # HTTP API
│   │   │   ├── router.go        # Route definitions
│   │   │   ├── middleware/      # Auth, logging, etc.
│   │   │   ├── handlers/        # HTTP handlers
│   │   │   │   ├── user.go
│   │   │   │   ├── post.go
│   │   │   │   ├── server.go
│   │   │   │   └── ...
│   │   │   └── dto/             # Request/Response DTOs
│   │   │       ├── user.go
│   │   │       └── ...
│   │   ├── websocket/           # WebSocket Gateway
│   │   │   ├── hub.go           # Connection hub
│   │   │   ├── client.go        # Client connection
│   │   │   └── events.go        # Event types
│   │   └── worker/              # Background jobs
│   │       ├── email.go
│   │       └── notification.go
│   │
│   ├── infrastructure/          # Infrastructure Layer
│   │   ├── postgres/            # PostgreSQL implementations
│   │   │   ├── connection.go
│   │   │   ├── user_repo.go
│   │   │   ├── post_repo.go
│   │   │   └── ...
│   │   ├── redis/               # Redis implementations
│   │   │   ├── connection.go
│   │   │   ├── cache.go
│   │   │   └── pubsub.go
│   │   ├── s3/                  # S3/MinIO storage
│   │   │   └── storage.go
│   │   └── auth/                # JWT, OAuth
│   │       ├── jwt.go
│   │       └── oauth.go
│   │
│   ├── config/                  # Configuration
│   │   └── config.go
│   │
│   └── pkg/                     # Shared internal packages
│       ├── validator/           # Input validation
│       ├── logger/              # Structured logging
│       ├── errors/              # Error handling
│       └── utils/               # Utilities
│
├── pkg/                         # Public packages (if any)
│   └── api/                     # API client SDK
│
├── migrations/                  # Database migrations
│   ├── 000001_init.up.sql
│   ├── 000001_init.down.sql
│   └── ...
│
├── scripts/                     # Build, deploy scripts
│   ├── build.sh
│   └── docker-entrypoint.sh
│
├── deployments/                 # Deployment configurations
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   └── k8s/
│       ├── deployment.yaml
│       └── service.yaml
│
├── docs/                        # Documentation
│   ├── 01-project-overview.md
│   ├── 02-architecture.md
│   └── ...
│
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

---

## Katman Detayları

### 1. Domain Layer

En içteki katman - saf iş mantığı, dış bağımlılık yok.

```go
// internal/domain/user/entity.go
package user

import (
    "time"
)

// Entity
type User struct {
    ID             string
    Handle         string
    DisplayName    string
    Email          string
    PasswordHash   string
    AvatarGradient [2]string
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

// Value Object
type Email struct {
    value string
}

func NewEmail(email string) (Email, error) {
    if !isValidEmail(email) {
        return Email{}, ErrInvalidEmail
    }
    return Email{value: email}, nil
}

func (e Email) String() string {
    return e.value
}
```

```go
// internal/domain/user/repository.go
package user

import "context"

// Repository Interface (Port)
type Repository interface {
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindByHandle(ctx context.Context, handle string) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}
```

### 2. Application Layer

Use case'leri orchestrate eder, domain service'leri kullanır.

```go
// internal/application/user/service.go
package user

import (
    "context"
    
    "xcord/internal/domain/user"
)

type Service struct {
    repo   user.Repository
    hasher PasswordHasher
    events EventPublisher
}

func NewService(repo user.Repository, hasher PasswordHasher, events EventPublisher) *Service {
    return &Service{
        repo:   repo,
        hasher: hasher,
        events: events,
    }
}

// Command: Create User
func (s *Service) CreateUser(ctx context.Context, cmd CreateUserCommand) (*user.User, error) {
    // Validate
    if err := cmd.Validate(); err != nil {
        return nil, err
    }
    
    // Check existing
    existing, _ := s.repo.FindByEmail(ctx, cmd.Email)
    if existing != nil {
        return nil, ErrEmailAlreadyExists
    }
    
    // Hash password
    hash, err := s.hasher.Hash(cmd.Password)
    if err != nil {
        return nil, err
    }
    
    // Create entity
    u := &user.User{
        ID:           generateID(),
        Handle:       cmd.Handle,
        DisplayName:  cmd.DisplayName,
        Email:        cmd.Email,
        PasswordHash: hash,
        CreatedAt:    time.Now(),
    }
    
    // Persist
    if err := s.repo.Create(ctx, u); err != nil {
        return nil, err
    }
    
    // Publish event
    s.events.Publish(ctx, UserCreatedEvent{UserID: u.ID})
    
    return u, nil
}

// Query: Get User
func (s *Service) GetUser(ctx context.Context, id string) (*user.User, error) {
    return s.repo.FindByID(ctx, id)
}
```

### 3. Adapters Layer

Dış dünya ile iletişim - HTTP, WebSocket, CLI.

```go
// internal/adapters/http/handlers/user.go
package handlers

import (
    "github.com/gofiber/fiber/v2"
    
    "xcord/internal/application/user"
    "xcord/internal/adapters/http/dto"
)

type UserHandler struct {
    service *user.Service
}

func NewUserHandler(service *user.Service) *UserHandler {
    return &UserHandler{service: service}
}

// POST /api/v1/users
func (h *UserHandler) Create(c *fiber.Ctx) error {
    var req dto.CreateUserRequest
    if err := c.BodyParser(&req); err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
    }
    
    if err := req.Validate(); err != nil {
        return fiber.NewError(fiber.StatusBadRequest, err.Error())
    }
    
    cmd := user.CreateUserCommand{
        Handle:      req.Handle,
        DisplayName: req.DisplayName,
        Email:       req.Email,
        Password:    req.Password,
    }
    
    u, err := h.service.CreateUser(c.Context(), cmd)
    if err != nil {
        return mapError(err)
    }
    
    return c.Status(fiber.StatusCreated).JSON(dto.CreateUserResponse{
        User: dto.UserFromEntity(u),
    })
}

// GET /api/v1/users/:id
func (h *UserHandler) GetByID(c *fiber.Ctx) error {
    id := c.Params("id")
    
    u, err := h.service.GetUser(c.Context(), id)
    if err != nil {
        return mapError(err)
    }
    
    return c.JSON(dto.GetUserResponse{
        User: dto.UserFromEntity(u),
    })
}
```

### 4. Infrastructure Layer

Teknik implementasyonlar - veritabanı, cache, external services.

```go
// internal/infrastructure/postgres/user_repo.go
package postgres

import (
    "context"
    
    "github.com/jackc/pgx/v5/pgxpool"
    
    "xcord/internal/domain/user"
)

type UserRepository struct {
    pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
    return &UserRepository{pool: pool}
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
    query := `
        SELECT id, handle, display_name, email, password_hash, 
               avatar_gradient, created_at, updated_at
        FROM users
        WHERE id = $1
    `
    
    var u user.User
    var gradient []string
    
    err := r.pool.QueryRow(ctx, query, id).Scan(
        &u.ID,
        &u.Handle,
        &u.DisplayName,
        &u.Email,
        &u.PasswordHash,
        &gradient,
        &u.CreatedAt,
        &u.UpdatedAt,
    )
    
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, user.ErrNotFound
        }
        return nil, fmt.Errorf("query user by id: %w", err)
    }
    
    if len(gradient) == 2 {
        u.AvatarGradient = [2]string{gradient[0], gradient[1]}
    }
    
    return &u, nil
}

func (r *UserRepository) Create(ctx context.Context, u *user.User) error {
    query := `
        INSERT INTO users (id, handle, display_name, email, password_hash, avatar_gradient, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
    
    _, err := r.pool.Exec(ctx, query,
        u.ID,
        u.Handle,
        u.DisplayName,
        u.Email,
        u.PasswordHash,
        u.AvatarGradient[:],
        u.CreatedAt,
        u.UpdatedAt,
    )
    
    if err != nil {
        return fmt.Errorf("insert user: %w", err)
    }
    
    return nil
}
```

---

## Module Yapısı

Her modül kendi domain, application ve adapter katmanlarına sahiptir:

```
internal/
├── domain/
│   ├── user/          # User Domain
│   ├── post/          # Post Domain
│   ├── server/        # Server Domain
│   ├── channel/       # Channel Domain
│   ├── message/       # Message Domain
│   └── live/          # Live Stream Domain
├── application/
│   ├── user/          # User Use Cases
│   ├── post/          # Post Use Cases
│   └── ...
└── adapters/
    └── http/
        └── handlers/
            ├── user.go
            ├── post.go
            └── ...
```

### Module Communication

Modüller arası iletişim interface'ler üzerinden:

```go
// Module A needs data from Module B
type UserResolver interface {
    GetUser(ctx context.Context, id string) (*user.User, error)
}

// Post service depends on UserResolver
type PostService struct {
    postRepo     post.Repository
    userResolver UserResolver  // Interface, not concrete type
}
```

---

## Bağımlılık Yönetimi

### Dependency Injection

Wire veya manual DI kullanılabilir. Örnek (manual):

```go
// cmd/api/main.go
func main() {
    // Load config
    cfg := config.Load()
    
    // Initialize infrastructure
    pgPool := postgres.NewPool(cfg.DatabaseURL)
    redisClient := redis.NewClient(cfg.RedisURL)
    
    // Initialize repositories
    userRepo := postgres.NewUserRepository(pgPool)
    postRepo := postgres.NewPostRepository(pgPool)
    
    // Initialize services
    userService := user.NewService(userRepo, bcrypt.NewHasher(), events.NewPublisher(redisClient))
    postService := post.NewService(postRepo, userService)
    
    // Initialize handlers
    userHandler := handlers.NewUserHandler(userService)
    postHandler := handlers.NewPostHandler(postService)
    
    // Setup router
    app := fiber.New()
    api := app.Group("/api/v1")
    
    api.Post("/users", userHandler.Create)
    api.Get("/users/:id", userHandler.GetByID)
    api.Get("/feed", postHandler.GetFeed)
    api.Post("/posts", postHandler.Create)
    
    // Start server
    log.Fatal(app.Listen(":8080"))
}
```

---

## Tasarım Desenleri

### 1. Repository Pattern

```go
// Interface in domain
type Repository interface {
    FindByID(ctx context.Context, id string) (*Entity, error)
    Create(ctx context.Context, entity *Entity) error
}

// Implementation in infrastructure
type PostgresRepository struct {
    pool *pgxpool.Pool
}
```

### 2. Service Pattern (Use Cases)

```go
type Service struct {
    repo   Repository
    cache  Cache
    events EventPublisher
}

func (s *Service) DoSomething(ctx context.Context, cmd Command) (*Result, error) {
    // Orchestration logic
}
```

### 3. Factory Pattern

```go
func NewServer(name string, ownerID string) *Server {
    return &Server{
        ID:        generateID(),
        Name:      name,
        OwnerID:   ownerID,
        Accent:    generateRandomColor(),
        CreatedAt: time.Now(),
    }
}
```

### 4. Observer Pattern (Events)

```go
type EventPublisher interface {
    Publish(ctx context.Context, event Event)
    Subscribe(eventType string, handler EventHandler)
}

type UserCreatedEvent struct {
    UserID string
}

// Publish
s.events.Publish(ctx, UserCreatedEvent{UserID: u.ID})

// Subscribe (in notification service)
events.Subscribe("user.created", func(e Event) {
    // Send welcome email
})
```

### 5. Middleware Pattern

```go
// Authentication middleware
func AuthMiddleware(jwtService *jwt.Service) fiber.Handler {
    return func(c *fiber.Ctx) error {
        token := extractToken(c)
        if token == "" {
            return fiber.ErrUnauthorized
        }
        
        claims, err := jwtService.Validate(token)
        if err != nil {
            return fiber.ErrUnauthorized
        }
        
        c.Locals("userID", claims.UserID)
        return c.Next()
    }
}
```

---

## Özet

| Aspect | Decision |
|--------|----------|
| **Architecture Style** | Clean Architecture (Hexagonal) |
| **Application Type** | Modular Monolith |
| **Dependency Direction** | Inward (Infrastructure → Domain) |
| **Module Communication** | Interfaces |
| **Database Access** | Repository Pattern |
| **API Style** | RESTful + WebSocket |

---

*Sonraki: [API Specification](./03-api-specification.md)*
