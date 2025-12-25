# XCORD Backend - Testing Strategy

> Versiyon: 1.0 | Tarih: 2025-12-21

---

## 📋 İçindekiler

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [E2E Testing](#e2e-testing)
5. [Performance Testing](#performance-testing)
6. [Test Infrastructure](#test-infrastructure)

---

## Testing Philosophy

### Test Pyramid

```
                    ┌───────────────┐
                    │     E2E       │  ← Few, slow, expensive
                    │   (10-15%)    │
                    └───────┬───────┘
                            │
                ┌───────────▼───────────┐
                │     Integration       │  ← More, moderate
                │       (20-30%)        │
                └───────────┬───────────┘
                            │
        ┌───────────────────▼───────────────────┐
        │              Unit Tests               │  ← Many, fast, cheap
        │               (60-70%)                │
        └───────────────────────────────────────┘
```

### Coverage Goals

| Layer | Coverage Target |
|-------|----------------|
| Domain | 90%+ |
| Application | 85%+ |
| Adapters | 75%+ |
| Infrastructure | 70%+ |
| **Overall** | **80%+** |

### Testing Commands

```bash
# Run all tests
make test

# Run with coverage
go test -v -race -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run specific package
go test -v ./internal/domain/user/...

# Run integration tests
go test -v -tags=integration ./...

# Run benchmarks
go test -bench=. -benchmem ./...
```

---

## Unit Testing

### Table-Driven Tests

```go
// internal/domain/user/entity_test.go
package user_test

import (
    "testing"
    
    "xcord/internal/domain/user"
)

func TestNewEmail(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr error
    }{
        {
            name:    "valid email",
            input:   "user@example.com",
            wantErr: nil,
        },
        {
            name:    "missing @",
            input:   "userexample.com",
            wantErr: user.ErrInvalidEmail,
        },
        {
            name:    "missing domain",
            input:   "user@",
            wantErr: user.ErrInvalidEmail,
        },
        {
            name:    "empty string",
            input:   "",
            wantErr: user.ErrInvalidEmail,
        },
        {
            name:    "valid with subdomain",
            input:   "user@mail.example.com",
            wantErr: nil,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            email, err := user.NewEmail(tt.input)
            
            if tt.wantErr != nil {
                if err != tt.wantErr {
                    t.Errorf("NewEmail(%q) error = %v, want %v", tt.input, err, tt.wantErr)
                }
                return
            }
            
            if err != nil {
                t.Errorf("NewEmail(%q) unexpected error: %v", tt.input, err)
                return
            }
            
            if email.String() != tt.input {
                t.Errorf("email.String() = %q, want %q", email.String(), tt.input)
            }
        })
    }
}
```

### Service Tests with Mocks

```go
// internal/application/user/service_test.go
package user_test

import (
    "context"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    
    "xcord/internal/application/user"
    "xcord/internal/domain/user"
)

// Mock repository
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
    args := m.Called(ctx, email)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) Create(ctx context.Context, u *user.User) error {
    args := m.Called(ctx, u)
    return args.Error(0)
}

// Mock password hasher
type MockPasswordHasher struct {
    mock.Mock
}

func (m *MockPasswordHasher) Hash(password string) (string, error) {
    args := m.Called(password)
    return args.String(0), args.Error(1)
}

func (m *MockPasswordHasher) Verify(password, hash string) error {
    args := m.Called(password, hash)
    return args.Error(0)
}

func TestUserService_CreateUser(t *testing.T) {
    t.Run("successful creation", func(t *testing.T) {
        // Setup
        repo := new(MockUserRepository)
        hasher := new(MockPasswordHasher)
        events := new(MockEventPublisher)
        
        service := user.NewService(repo, hasher, events)
        
        cmd := user.CreateUserCommand{
            Handle:      "testuser",
            DisplayName: "Test User",
            Email:       "test@example.com",
            Password:    "SecurePass123",
        }
        
        // Expectations
        repo.On("FindByEmail", mock.Anything, "test@example.com").Return(nil, user.ErrNotFound)
        hasher.On("Hash", "SecurePass123").Return("hashed_password", nil)
        repo.On("Create", mock.Anything, mock.AnythingOfType("*user.User")).Return(nil)
        events.On("Publish", mock.Anything, mock.AnythingOfType("user.UserCreatedEvent")).Return(nil)
        
        // Execute
        result, err := service.CreateUser(context.Background(), cmd)
        
        // Assert
        assert.NoError(t, err)
        assert.NotNil(t, result)
        assert.Equal(t, "testuser", result.Handle)
        assert.Equal(t, "test@example.com", result.Email)
        
        repo.AssertExpectations(t)
        hasher.AssertExpectations(t)
        events.AssertExpectations(t)
    })
    
    t.Run("email already exists", func(t *testing.T) {
        repo := new(MockUserRepository)
        hasher := new(MockPasswordHasher)
        events := new(MockEventPublisher)
        
        service := user.NewService(repo, hasher, events)
        
        existingUser := &user.User{
            ID:    "existing_id",
            Email: "test@example.com",
        }
        
        repo.On("FindByEmail", mock.Anything, "test@example.com").Return(existingUser, nil)
        
        cmd := user.CreateUserCommand{
            Handle:      "testuser",
            DisplayName: "Test User",
            Email:       "test@example.com",
            Password:    "SecurePass123",
        }
        
        result, err := service.CreateUser(context.Background(), cmd)
        
        assert.ErrorIs(t, err, user.ErrEmailAlreadyExists)
        assert.Nil(t, result)
    })
}
```

### Handler Tests

```go
// internal/adapters/http/handlers/user_test.go
package handlers_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gofiber/fiber/v2"
    "github.com/stretchr/testify/assert"
    
    "xcord/internal/adapters/http/handlers"
    "xcord/internal/adapters/http/dto"
)

func TestUserHandler_Create(t *testing.T) {
    t.Run("valid request", func(t *testing.T) {
        // Setup mock service
        mockService := new(MockUserService)
        mockService.On("CreateUser", mock.Anything, mock.AnythingOfType("user.CreateUserCommand")).
            Return(&user.User{
                ID:          "user_123",
                Handle:      "testuser",
                DisplayName: "Test User",
                Email:       "test@example.com",
            }, nil)
        
        handler := handlers.NewUserHandler(mockService)
        
        app := fiber.New()
        app.Post("/users", handler.Create)
        
        // Create request
        body := dto.CreateUserRequest{
            Handle:      "testuser",
            DisplayName: "Test User",
            Email:       "test@example.com",
            Password:    "SecurePass123",
        }
        jsonBody, _ := json.Marshal(body)
        
        req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(jsonBody))
        req.Header.Set("Content-Type", "application/json")
        
        // Execute
        resp, err := app.Test(req, -1)
        
        // Assert
        assert.NoError(t, err)
        assert.Equal(t, http.StatusCreated, resp.StatusCode)
        
        var result dto.CreateUserResponse
        json.NewDecoder(resp.Body).Decode(&result)
        
        assert.Equal(t, "user_123", result.User.ID)
        assert.Equal(t, "testuser", result.User.Handle)
    })
    
    t.Run("invalid email", func(t *testing.T) {
        handler := handlers.NewUserHandler(nil) // Service won't be called
        
        app := fiber.New()
        app.Post("/users", handler.Create)
        
        body := dto.CreateUserRequest{
            Handle:      "testuser",
            DisplayName: "Test User",
            Email:       "invalid-email",
            Password:    "SecurePass123",
        }
        jsonBody, _ := json.Marshal(body)
        
        req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(jsonBody))
        req.Header.Set("Content-Type", "application/json")
        
        resp, err := app.Test(req, -1)
        
        assert.NoError(t, err)
        assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
    })
}
```

---

## Integration Testing

### Database Tests

```go
// internal/infrastructure/postgres/user_repo_test.go
//go:build integration

package postgres_test

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    
    "xcord/internal/domain/user"
    "xcord/internal/infrastructure/postgres"
    "xcord/internal/pkg/testutil"
)

type UserRepositoryTestSuite struct {
    suite.Suite
    pool *pgxpool.Pool
    repo *postgres.UserRepository
}

func TestUserRepository(t *testing.T) {
    suite.Run(t, new(UserRepositoryTestSuite))
}

func (s *UserRepositoryTestSuite) SetupSuite() {
    s.pool = testutil.NewTestDB(s.T())
    s.repo = postgres.NewUserRepository(s.pool)
}

func (s *UserRepositoryTestSuite) TearDownSuite() {
    s.pool.Close()
}

func (s *UserRepositoryTestSuite) SetupTest() {
    // Clean tables before each test
    ctx := context.Background()
    s.pool.Exec(ctx, "TRUNCATE users CASCADE")
}

func (s *UserRepositoryTestSuite) TestCreate() {
    ctx := context.Background()
    
    u := &user.User{
        ID:             "user_test123",
        Handle:         "testuser",
        DisplayName:    "Test User",
        Email:          "test@example.com",
        PasswordHash:   "hashed",
        AvatarGradient: [2]string{"#ff0000", "#00ff00"},
        CreatedAt:      time.Now(),
        UpdatedAt:      time.Now(),
    }
    
    err := s.repo.Create(ctx, u)
    s.NoError(err)
    
    // Verify
    found, err := s.repo.FindByID(ctx, u.ID)
    s.NoError(err)
    s.Equal(u.Handle, found.Handle)
    s.Equal(u.Email, found.Email)
}

func (s *UserRepositoryTestSuite) TestFindByEmail() {
    ctx := context.Background()
    
    // Create user
    u := &user.User{
        ID:           "user_email_test",
        Handle:       "emailtest",
        DisplayName:  "Email Test",
        Email:        "email@test.com",
        PasswordHash: "hashed",
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }
    s.repo.Create(ctx, u)
    
    // Find by email
    found, err := s.repo.FindByEmail(ctx, "email@test.com")
    s.NoError(err)
    s.Equal(u.ID, found.ID)
    
    // Not found
    _, err = s.repo.FindByEmail(ctx, "notfound@test.com")
    s.ErrorIs(err, user.ErrNotFound)
}
```

### API Integration Tests

```go
// tests/integration/api_test.go
//go:build integration

package integration_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/stretchr/testify/suite"
    
    "xcord/internal/app"
    "xcord/internal/pkg/testutil"
)

type APITestSuite struct {
    suite.Suite
    app    *app.Application
    server *httptest.Server
}

func TestAPI(t *testing.T) {
    suite.Run(t, new(APITestSuite))
}

func (s *APITestSuite) SetupSuite() {
    cfg := testutil.LoadTestConfig()
    s.app = app.New(cfg)
    s.server = httptest.NewServer(s.app.Handler())
}

func (s *APITestSuite) TearDownSuite() {
    s.server.Close()
    s.app.Shutdown()
}

func (s *APITestSuite) TestAuthFlow() {
    // 1. Register
    registerBody := map[string]string{
        "handle":      "testuser",
        "displayName": "Test User",
        "email":       "test@example.com",
        "password":    "SecurePass123",
    }
    registerJSON, _ := json.Marshal(registerBody)
    
    resp, err := http.Post(
        s.server.URL+"/api/v1/auth/register",
        "application/json",
        bytes.NewReader(registerJSON),
    )
    s.NoError(err)
    s.Equal(http.StatusCreated, resp.StatusCode)
    
    var registerResult struct {
        Data struct {
            User struct {
                ID string `json:"id"`
            } `json:"user"`
            Tokens struct {
                AccessToken  string `json:"accessToken"`
                RefreshToken string `json:"refreshToken"`
            } `json:"tokens"`
        } `json:"data"`
    }
    json.NewDecoder(resp.Body).Decode(&registerResult)
    resp.Body.Close()
    
    accessToken := registerResult.Data.Tokens.AccessToken
    s.NotEmpty(accessToken)
    
    // 2. Get current user
    req, _ := http.NewRequest(http.MethodGet, s.server.URL+"/api/v1/me", nil)
    req.Header.Set("Authorization", "Bearer "+accessToken)
    
    resp, err = http.DefaultClient.Do(req)
    s.NoError(err)
    s.Equal(http.StatusOK, resp.StatusCode)
    resp.Body.Close()
    
    // 3. Refresh token
    refreshBody := map[string]string{
        "refreshToken": registerResult.Data.Tokens.RefreshToken,
    }
    refreshJSON, _ := json.Marshal(refreshBody)
    
    resp, err = http.Post(
        s.server.URL+"/api/v1/auth/refresh",
        "application/json",
        bytes.NewReader(refreshJSON),
    )
    s.NoError(err)
    s.Equal(http.StatusOK, resp.StatusCode)
    resp.Body.Close()
}

func (s *APITestSuite) TestPostFlow() {
    // Setup: Create user and get token
    token := s.createUserAndGetToken("postuser", "post@example.com")
    
    // Create post
    postBody := map[string]string{
        "text":       "Hello, XCORD!",
        "visibility": "public",
    }
    postJSON, _ := json.Marshal(postBody)
    
    req, _ := http.NewRequest(http.MethodPost, s.server.URL+"/api/v1/posts", bytes.NewReader(postJSON))
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")
    
    resp, err := http.DefaultClient.Do(req)
    s.NoError(err)
    s.Equal(http.StatusCreated, resp.StatusCode)
    
    var postResult struct {
        Data struct {
            Post struct {
                ID string `json:"id"`
            } `json:"post"`
        } `json:"data"`
    }
    json.NewDecoder(resp.Body).Decode(&postResult)
    resp.Body.Close()
    
    postID := postResult.Data.Post.ID
    
    // Like post
    req, _ = http.NewRequest(http.MethodPost, s.server.URL+"/api/v1/posts/"+postID+"/like", nil)
    req.Header.Set("Authorization", "Bearer "+token)
    
    resp, err = http.DefaultClient.Do(req)
    s.NoError(err)
    s.Equal(http.StatusOK, resp.StatusCode)
    resp.Body.Close()
}

func (s *APITestSuite) createUserAndGetToken(handle, email string) string {
    // Implementation...
    return "token"
}
```

---

## E2E Testing

### WebSocket Tests

```go
// tests/e2e/websocket_test.go
//go:build e2e

package e2e_test

import (
    "encoding/json"
    "testing"
    "time"
    
    "github.com/gorilla/websocket"
    "github.com/stretchr/testify/suite"
)

type WebSocketTestSuite struct {
    suite.Suite
    baseURL string
}

func TestWebSocket(t *testing.T) {
    suite.Run(t, new(WebSocketTestSuite))
}

func (s *WebSocketTestSuite) TestMessageDelivery() {
    // Create two users
    user1Token := s.createUser("user1", "user1@test.com")
    user2Token := s.createUser("user2", "user2@test.com")
    
    // Start DM conversation
    conversationID := s.createConversation(user1Token, "user2_id")
    
    // Connect user2 to WebSocket
    wsURL := "ws" + strings.TrimPrefix(s.baseURL, "http") + "/api/v1/ws"
    conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
    s.NoError(err)
    defer conn.Close()
    
    // Authenticate
    conn.WriteJSON(map[string]interface{}{
        "type":    "HELLO",
        "payload": map[string]string{"token": user2Token},
    })
    
    // Subscribe to DM channel
    conn.WriteJSON(map[string]interface{}{
        "type":    "SUBSCRIBE",
        "payload": map[string]interface{}{"channels": []string{"dm:" + conversationID}},
    })
    
    // User1 sends message
    s.sendMessage(user1Token, conversationID, "Hello from user1!")
    
    // User2 should receive message via WebSocket
    conn.SetReadDeadline(time.Now().Add(5 * time.Second))
    _, msg, err := conn.ReadMessage()
    s.NoError(err)
    
    var event struct {
        Type    string `json:"type"`
        Payload struct {
            Message struct {
                Text string `json:"text"`
            } `json:"message"`
        } `json:"payload"`
    }
    json.Unmarshal(msg, &event)
    
    s.Equal("dm.message.new", event.Type)
    s.Equal("Hello from user1!", event.Payload.Message.Text)
}
```

---

## Performance Testing

### Benchmarks

```go
// internal/infrastructure/postgres/user_repo_benchmark_test.go
package postgres_test

import (
    "context"
    "testing"
    
    "xcord/internal/domain/user"
    "xcord/internal/infrastructure/postgres"
)

func BenchmarkUserRepository_FindByID(b *testing.B) {
    pool := setupBenchmarkDB(b)
    repo := postgres.NewUserRepository(pool)
    
    // Create test user
    ctx := context.Background()
    testUser := createTestUser(ctx, repo)
    
    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            repo.FindByID(ctx, testUser.ID)
        }
    })
}

func BenchmarkUserRepository_Create(b *testing.B) {
    pool := setupBenchmarkDB(b)
    repo := postgres.NewUserRepository(pool)
    ctx := context.Background()
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        u := &user.User{
            ID:           generateID(),
            Handle:       fmt.Sprintf("bench%d", i),
            DisplayName:  "Benchmark User",
            Email:        fmt.Sprintf("bench%d@test.com", i),
            PasswordHash: "hashed",
            CreatedAt:    time.Now(),
            UpdatedAt:    time.Now(),
        }
        repo.Create(ctx, u)
    }
}
```

### Load Testing (k6)

```javascript
// tests/load/api_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 100 },   // Ramp up
        { duration: '5m', target: 100 },   // Stay at 100 users
        { duration: '1m', target: 0 },     // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<200'],  // 95% of requests < 200ms
        http_req_failed: ['rate<0.01'],    // < 1% failure rate
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
    // Create test user and get token
    const res = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
        handle: 'loadtest',
        displayName: 'Load Test',
        email: 'loadtest@test.com',
        password: 'LoadTest123',
    }), {
        headers: { 'Content-Type': 'application/json' },
    });
    
    return JSON.parse(res.body).data.tokens.accessToken;
}

export default function(token) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    
    // Get feed
    const feedRes = http.get(`${BASE_URL}/api/v1/feed`, { headers });
    check(feedRes, {
        'feed status is 200': (r) => r.status === 200,
        'feed response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    sleep(1);
    
    // Create post
    const postRes = http.post(`${BASE_URL}/api/v1/posts`, JSON.stringify({
        text: 'Load test post ' + Date.now(),
        visibility: 'public',
    }), { headers });
    check(postRes, {
        'post status is 201': (r) => r.status === 201,
    });
    
    sleep(1);
}
```

---

## Test Infrastructure

### Test Utilities

```go
// internal/pkg/testutil/db.go
package testutil

import (
    "context"
    "os"
    "testing"
    
    "github.com/jackc/pgx/v5/pgxpool"
)

func NewTestDB(t *testing.T) *pgxpool.Pool {
    t.Helper()
    
    dbURL := os.Getenv("TEST_DATABASE_URL")
    if dbURL == "" {
        dbURL = "postgres://test:test@localhost:5432/xcord_test?sslmode=disable"
    }
    
    pool, err := pgxpool.New(context.Background(), dbURL)
    if err != nil {
        t.Fatalf("Failed to connect to test database: %v", err)
    }
    
    t.Cleanup(func() {
        pool.Close()
    })
    
    return pool
}

func CleanTables(t *testing.T, pool *pgxpool.Pool, tables ...string) {
    t.Helper()
    
    ctx := context.Background()
    for _, table := range tables {
        _, err := pool.Exec(ctx, "TRUNCATE "+table+" CASCADE")
        if err != nil {
            t.Fatalf("Failed to truncate %s: %v", table, err)
        }
    }
}
```

### Test Fixtures

```go
// internal/pkg/testutil/fixtures.go
package testutil

import (
    "time"
    
    "xcord/internal/domain/user"
)

func NewTestUser(overrides ...func(*user.User)) *user.User {
    u := &user.User{
        ID:             "user_test_" + randomString(8),
        Handle:         "testuser_" + randomString(6),
        DisplayName:    "Test User",
        Email:          "test_" + randomString(6) + "@example.com",
        PasswordHash:   "$2a$13$...", // bcrypt hash of "password123"
        AvatarGradient: [2]string{"#ff6b6b", "#4ecdc4"},
        CreatedAt:      time.Now(),
        UpdatedAt:      time.Now(),
    }
    
    for _, override := range overrides {
        override(u)
    }
    
    return u
}

func WithHandle(handle string) func(*user.User) {
    return func(u *user.User) {
        u.Handle = handle
    }
}

func WithEmail(email string) func(*user.User) {
    return func(u *user.User) {
        u.Email = email
    }
}
```

---

*Sonraki: [Monitoring](./09-monitoring.md)*
