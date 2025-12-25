# XCORD Backend - Monitoring & Observability

> Versiyon: 1.0 | Tarih: 2025-12-21

---

## 📋 İçindekiler

1. [Observability Stack](#observability-stack)
2. [Structured Logging](#structured-logging)
3. [Metrics](#metrics)
4. [Distributed Tracing](#distributed-tracing)
5. [Alerting](#alerting)
6. [Health Checks](#health-checks)

---

## Observability Stack

### Three Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                     OBSERVABILITY STACK                         │
├─────────────────────┬─────────────────────┬────────────────────┤
│       LOGS          │       METRICS       │      TRACES        │
│                     │                     │                    │
│  ┌─────────────┐    │  ┌─────────────┐    │  ┌─────────────┐  │
│  │   slog      │    │  │ Prometheus  │    │  │ OpenTelemetry│  │
│  │  (Go 1.21+) │    │  │   Client    │    │  │    SDK      │  │
│  └──────┬──────┘    │  └──────┬──────┘    │  └──────┬──────┘  │
│         │           │         │           │         │          │
│  ┌──────▼──────┐    │  ┌──────▼──────┐    │  ┌──────▼──────┐  │
│  │    Loki     │    │  │ Prometheus  │    │  │    Tempo    │  │
│  │             │    │  │   Server    │    │  │   /Jaeger   │  │
│  └──────┬──────┘    │  └──────┬──────┘    │  └──────┬──────┘  │
│         │           │         │           │         │          │
│         └───────────┴─────────┴───────────┴─────────┘          │
│                              │                                  │
│                     ┌────────▼────────┐                        │
│                     │     Grafana     │                        │
│                     │   (Dashboard)   │                        │
│                     └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Category | Tool | Purpose |
|----------|------|---------|
| **Logging** | slog + Loki | Structured logging, log aggregation |
| **Metrics** | Prometheus + Grafana | Time-series metrics, visualization |
| **Tracing** | OpenTelemetry + Tempo | Distributed tracing |
| **Alerting** | Alertmanager | Alert routing and notifications |
| **Error Tracking** | Sentry | Error aggregation and analysis |

---

## Structured Logging

### Logger Setup

```go
// internal/pkg/logger/logger.go
package logger

import (
    "context"
    "log/slog"
    "os"
)

type contextKey string

const (
    RequestIDKey contextKey = "request_id"
    UserIDKey    contextKey = "user_id"
)

var defaultLogger *slog.Logger

func Init(level string, format string) {
    var handler slog.Handler
    
    opts := &slog.HandlerOptions{
        Level:     parseLevel(level),
        AddSource: true,
    }
    
    if format == "json" {
        handler = slog.NewJSONHandler(os.Stdout, opts)
    } else {
        handler = slog.NewTextHandler(os.Stdout, opts)
    }
    
    defaultLogger = slog.New(handler)
    slog.SetDefault(defaultLogger)
}

func parseLevel(level string) slog.Level {
    switch level {
    case "debug":
        return slog.LevelDebug
    case "info":
        return slog.LevelInfo
    case "warn":
        return slog.LevelWarn
    case "error":
        return slog.LevelError
    default:
        return slog.LevelInfo
    }
}

// Context-aware logging
func FromContext(ctx context.Context) *slog.Logger {
    logger := defaultLogger
    
    if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
        logger = logger.With("request_id", requestID)
    }
    
    if userID, ok := ctx.Value(UserIDKey).(string); ok {
        logger = logger.With("user_id", userID)
    }
    
    return logger
}

// Helper functions
func Debug(ctx context.Context, msg string, args ...any) {
    FromContext(ctx).Debug(msg, args...)
}

func Info(ctx context.Context, msg string, args ...any) {
    FromContext(ctx).Info(msg, args...)
}

func Warn(ctx context.Context, msg string, args ...any) {
    FromContext(ctx).Warn(msg, args...)
}

func Error(ctx context.Context, msg string, args ...any) {
    FromContext(ctx).Error(msg, args...)
}
```

### Request Logging Middleware

```go
// internal/adapters/http/middleware/logging.go
package middleware

import (
    "time"
    
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    
    "xcord/internal/pkg/logger"
)

func RequestLogging() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        // Generate request ID
        requestID := c.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        c.Set("X-Request-ID", requestID)
        
        // Add to context
        ctx := context.WithValue(c.Context(), logger.RequestIDKey, requestID)
        c.SetUserContext(ctx)
        
        // Log request
        logger.Info(ctx, "request started",
            "method", c.Method(),
            "path", c.Path(),
            "ip", c.IP(),
            "user_agent", c.Get("User-Agent"),
        )
        
        // Process request
        err := c.Next()
        
        // Log response
        duration := time.Since(start)
        logger.Info(ctx, "request completed",
            "method", c.Method(),
            "path", c.Path(),
            "status", c.Response().StatusCode(),
            "duration_ms", duration.Milliseconds(),
            "bytes", len(c.Response().Body()),
        )
        
        return err
    }
}
```

### Log Format Examples

```json
// JSON format (production)
{
  "time": "2025-01-01T12:00:00.000Z",
  "level": "INFO",
  "source": "internal/adapters/http/middleware/logging.go:45",
  "msg": "request completed",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_abc123",
  "method": "GET",
  "path": "/api/v1/feed",
  "status": 200,
  "duration_ms": 45,
  "bytes": 12345
}

// Error log with stack trace
{
  "time": "2025-01-01T12:00:00.000Z",
  "level": "ERROR",
  "source": "internal/application/user/service.go:89",
  "msg": "failed to create user",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "error": "UNIQUE constraint failed: users.email",
  "email": "us***@example.com"
}
```

---

## Metrics

### Prometheus Metrics Setup

```go
// internal/pkg/metrics/metrics.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // HTTP Metrics
    HTTPRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    
    HTTPRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
        },
        []string{"method", "path"},
    )
    
    HTTPRequestSize = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_size_bytes",
            Help:    "HTTP request size in bytes",
            Buckets: prometheus.ExponentialBuckets(100, 10, 8),
        },
        []string{"method", "path"},
    )
    
    HTTPResponseSize = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_response_size_bytes",
            Help:    "HTTP response size in bytes",
            Buckets: prometheus.ExponentialBuckets(100, 10, 8),
        },
        []string{"method", "path"},
    )
    
    // WebSocket Metrics
    WSConnectionsActive = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "websocket_connections_active",
            Help: "Number of active WebSocket connections",
        },
    )
    
    WSMessagesTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "websocket_messages_total",
            Help: "Total WebSocket messages",
        },
        []string{"direction", "type"},
    )
    
    // Database Metrics
    DBQueriesTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "db_queries_total",
            Help: "Total database queries",
        },
        []string{"query", "status"},
    )
    
    DBQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "db_query_duration_seconds",
            Help:    "Database query duration",
            Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
        },
        []string{"query"},
    )
    
    DBConnectionPoolSize = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "db_connection_pool_size",
            Help: "Database connection pool size",
        },
        []string{"state"},
    )
    
    // Redis Metrics
    RedisCommandsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "redis_commands_total",
            Help: "Total Redis commands",
        },
        []string{"command", "status"},
    )
    
    RedisCommandDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "redis_command_duration_seconds",
            Help:    "Redis command duration",
            Buckets: []float64{.0001, .0005, .001, .005, .01, .025, .05, .1},
        },
        []string{"command"},
    )
    
    // Business Metrics
    UsersTotal = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "xcord_users_total",
            Help: "Total registered users",
        },
    )
    
    PostsCreated = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "xcord_posts_created_total",
            Help: "Total posts created",
        },
    )
    
    MessagesCreated = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "xcord_messages_created_total",
            Help: "Total messages created",
        },
        []string{"type"}, // dm, channel, live_chat
    )
    
    LiveStreamsActive = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "xcord_live_streams_active",
            Help: "Number of active live streams",
        },
    )
)
```

### Metrics Middleware

```go
// internal/adapters/http/middleware/metrics.go
package middleware

import (
    "strconv"
    "time"
    
    "github.com/gofiber/fiber/v2"
    
    "xcord/internal/pkg/metrics"
)

func Metrics() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        err := c.Next()
        
        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Response().StatusCode())
        path := normalizePath(c.Path())
        method := c.Method()
        
        metrics.HTTPRequestsTotal.WithLabelValues(method, path, status).Inc()
        metrics.HTTPRequestDuration.WithLabelValues(method, path).Observe(duration)
        metrics.HTTPRequestSize.WithLabelValues(method, path).Observe(float64(len(c.Body())))
        metrics.HTTPResponseSize.WithLabelValues(method, path).Observe(float64(len(c.Response().Body())))
        
        return err
    }
}

// Normalize paths with IDs
func normalizePath(path string) string {
    // /api/v1/users/user_abc123 -> /api/v1/users/:id
    // /api/v1/posts/post_xyz/like -> /api/v1/posts/:id/like
    return path // Implement path normalization
}
```

### Metrics Endpoint

```go
// internal/adapters/http/router.go
import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/adaptor/v2"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func SetupRouter(app *fiber.App) {
    // Metrics endpoint (internal only)
    app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "XCORD API Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (status)",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Request Latency (p99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))",
            "legendFormat": "{{path}}"
          }
        ]
      },
      {
        "title": "Active WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_connections_active"
          }
        ]
      },
      {
        "title": "Database Query Latency",
        "type": "heatmap",
        "targets": [
          {
            "expr": "sum(rate(db_query_duration_seconds_bucket[5m])) by (le)"
          }
        ]
      }
    ]
  }
}
```

---

## Distributed Tracing

### OpenTelemetry Setup

```go
// internal/pkg/tracing/tracing.go
package tracing

import (
    "context"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
    "go.opentelemetry.io/otel/trace"
)

var tracer trace.Tracer

func Init(ctx context.Context, serviceName, endpoint string) (*sdktrace.TracerProvider, error) {
    client := otlptracegrpc.NewClient(
        otlptracegrpc.WithEndpoint(endpoint),
        otlptracegrpc.WithInsecure(),
    )
    
    exporter, err := otlptrace.New(ctx, client)
    if err != nil {
        return nil, err
    }
    
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }
    
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)), // 10% sampling
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )
    
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))
    
    tracer = tp.Tracer(serviceName)
    
    return tp, nil
}

func Tracer() trace.Tracer {
    return tracer
}
```

### Tracing Middleware

```go
// internal/adapters/http/middleware/tracing.go
package middleware

import (
    "github.com/gofiber/fiber/v2"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
    "go.opentelemetry.io/otel/trace"
)

func Tracing(serviceName string) fiber.Handler {
    tracer := otel.Tracer(serviceName)
    
    return func(c *fiber.Ctx) error {
        // Extract trace context from headers
        ctx := otel.GetTextMapPropagator().Extract(
            c.Context(),
            propagation.HeaderCarrier(c.GetReqHeaders()),
        )
        
        // Start span
        spanName := c.Method() + " " + c.Path()
        ctx, span := tracer.Start(ctx, spanName,
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                semconv.HTTPMethod(c.Method()),
                semconv.HTTPRoute(c.Path()),
                semconv.HTTPTarget(c.OriginalURL()),
                attribute.String("http.client_ip", c.IP()),
            ),
        )
        defer span.End()
        
        // Store in context
        c.SetUserContext(ctx)
        
        // Process request
        err := c.Next()
        
        // Record response
        span.SetAttributes(
            semconv.HTTPStatusCode(c.Response().StatusCode()),
        )
        
        if err != nil {
            span.RecordError(err)
        }
        
        return err
    }
}
```

### Database Tracing

```go
// internal/infrastructure/postgres/traced_repo.go
package postgres

import (
    "context"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

type TracedUserRepository struct {
    repo   *UserRepository
    tracer trace.Tracer
}

func NewTracedUserRepository(repo *UserRepository) *TracedUserRepository {
    return &TracedUserRepository{
        repo:   repo,
        tracer: otel.Tracer("postgres"),
    }
}

func (r *TracedUserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
    ctx, span := r.tracer.Start(ctx, "postgres.FindUserByID",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "SELECT"),
            attribute.String("db.table", "users"),
            attribute.String("user.id", id),
        ),
    )
    defer span.End()
    
    result, err := r.repo.FindByID(ctx, id)
    if err != nil {
        span.RecordError(err)
    }
    
    return result, err
}
```

---

## Alerting

### Alertmanager Rules

```yaml
# alerting/rules.yml
groups:
  - name: xcord-api
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High request latency
          description: "p99 latency is {{ $value }}s"
      
      # Database connection pool exhausted
      - alert: DBConnectionPoolExhausted
        expr: |
          db_connection_pool_size{state="idle"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database connection pool exhausted
          description: "No idle database connections available"
      
      # High WebSocket connection count
      - alert: HighWebSocketConnections
        expr: |
          websocket_connections_active > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High WebSocket connection count
          description: "{{ $value }} active WebSocket connections"
      
      # API down
      - alert: APIDown
        expr: |
          up{job="xcord-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: XCORD API is down
          description: "API instance {{ $labels.instance }} is down"
```

### Sentry Integration

```go
// internal/pkg/sentry/sentry.go
package sentry

import (
    "github.com/getsentry/sentry-go"
    sentryfiber "github.com/getsentry/sentry-go/fiber"
    "github.com/gofiber/fiber/v2"
)

func Init(dsn string, env string) error {
    return sentry.Init(sentry.ClientOptions{
        Dsn:              dsn,
        Environment:      env,
        TracesSampleRate: 0.1,
        EnableTracing:    true,
    })
}

func Middleware() fiber.Handler {
    return sentryfiber.New(sentryfiber.Options{
        Repanic: true,
    })
}

func CaptureError(err error) {
    sentry.CaptureException(err)
}

func CaptureMessage(msg string) {
    sentry.CaptureMessage(msg)
}
```

---

## Health Checks

### Health Check Endpoints

```go
// internal/adapters/http/handlers/health.go
package handlers

import (
    "context"
    "time"
    
    "github.com/gofiber/fiber/v2"
)

type HealthHandler struct {
    db    *pgxpool.Pool
    redis *redis.Client
}

type HealthStatus struct {
    Status    string            `json:"status"`
    Timestamp string            `json:"timestamp"`
    Checks    map[string]Check  `json:"checks"`
}

type Check struct {
    Status  string `json:"status"`
    Latency string `json:"latency,omitempty"`
    Error   string `json:"error,omitempty"`
}

// GET /health - Basic liveness check
func (h *HealthHandler) Liveness(c *fiber.Ctx) error {
    return c.JSON(fiber.Map{
        "status": "ok",
    })
}

// GET /ready - Full readiness check
func (h *HealthHandler) Readiness(c *fiber.Ctx) error {
    ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
    defer cancel()
    
    checks := make(map[string]Check)
    allHealthy := true
    
    // Check PostgreSQL
    dbCheck := h.checkDatabase(ctx)
    checks["postgresql"] = dbCheck
    if dbCheck.Status != "ok" {
        allHealthy = false
    }
    
    // Check Redis
    redisCheck := h.checkRedis(ctx)
    checks["redis"] = redisCheck
    if redisCheck.Status != "ok" {
        allHealthy = false
    }
    
    status := "ok"
    httpStatus := fiber.StatusOK
    if !allHealthy {
        status = "degraded"
        httpStatus = fiber.StatusServiceUnavailable
    }
    
    return c.Status(httpStatus).JSON(HealthStatus{
        Status:    status,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Checks:    checks,
    })
}

func (h *HealthHandler) checkDatabase(ctx context.Context) Check {
    start := time.Now()
    
    err := h.db.Ping(ctx)
    latency := time.Since(start)
    
    if err != nil {
        return Check{
            Status:  "error",
            Latency: latency.String(),
            Error:   err.Error(),
        }
    }
    
    return Check{
        Status:  "ok",
        Latency: latency.String(),
    }
}

func (h *HealthHandler) checkRedis(ctx context.Context) Check {
    start := time.Now()
    
    _, err := h.redis.Ping(ctx).Result()
    latency := time.Since(start)
    
    if err != nil {
        return Check{
            Status:  "error",
            Latency: latency.String(),
            Error:   err.Error(),
        }
    }
    
    return Check{
        Status:  "ok",
        Latency: latency.String(),
    }
}
```

### Response Examples

```json
// GET /health (liveness)
{
  "status": "ok"
}

// GET /ready (readiness)
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00Z",
  "checks": {
    "postgresql": {
      "status": "ok",
      "latency": "1.234ms"
    },
    "redis": {
      "status": "ok",
      "latency": "0.567ms"
    }
  }
}

// GET /ready (degraded)
{
  "status": "degraded",
  "timestamp": "2025-01-01T12:00:00Z",
  "checks": {
    "postgresql": {
      "status": "ok",
      "latency": "1.234ms"
    },
    "redis": {
      "status": "error",
      "latency": "5.001s",
      "error": "connection refused"
    }
  }
}
```

---

*Sonraki: [Development Roadmap](./10-development-roadmap.md)*
