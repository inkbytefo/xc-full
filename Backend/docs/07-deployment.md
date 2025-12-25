# XCORD Backend - Deployment

> Versiyon: 1.0 | Tarih: 2025-12-21

---

## 📋 İçindekiler

1. [Development Environment](#development-environment)
2. [Docker Configuration](#docker-configuration)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Environment Configuration](#environment-configuration)

---

## Development Environment

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.23+ | Runtime |
| Docker | 24+ | Containerization |
| Docker Compose | 2.20+ | Local services |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Cache/PubSub |
| migrate | latest | DB migrations |
| golangci-lint | 1.55+ | Linting |
| air | latest | Hot reload |

### Local Setup

```bash
# Clone repository
git clone https://github.com/xcord/backend.git
cd backend

# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Start infrastructure
docker compose up -d postgres redis

# Run migrations
make migrate-up

# Start development server
make dev
```

### Makefile

```makefile
# Makefile

.PHONY: dev build test lint migrate-up migrate-down

# Development
dev:
	air

# Build
build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/api ./cmd/api

# Testing
test:
	go test -v -race -cover ./...

test-integration:
	go test -v -tags=integration ./...

# Linting
lint:
	golangci-lint run ./...

# Migrations
migrate-up:
	migrate -path ./migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path ./migrations -database "$(DATABASE_URL)" down 1

migrate-create:
	migrate create -ext sql -dir ./migrations -seq $(name)

# Docker
docker-build:
	docker build -t xcord-api:latest -f deployments/docker/Dockerfile .

docker-push:
	docker push gcr.io/xcord/api:$(VERSION)

# Generate
generate:
	sqlc generate
	go generate ./...

# Clean
clean:
	rm -rf bin/
	go clean -cache
```

### Air Configuration (.air.toml)

```toml
# .air.toml
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/main ./cmd/api"
bin = "tmp/main"
delay = 1000
exclude_dir = ["assets", "tmp", "vendor", "migrations"]
include_ext = ["go", "tpl", "tmpl", "html"]
exclude_regex = ["_test.go"]
stop_on_error = true

[log]
time = true

[color]
main = "yellow"
watcher = "cyan"
build = "green"
runner = "magenta"
```

---

## Docker Configuration

### Dockerfile

```dockerfile
# deployments/docker/Dockerfile

# Build stage
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Create non-root user
RUN adduser -D -g '' appuser

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X main.version=${VERSION}" \
    -o /build/api ./cmd/api

# Final stage
FROM alpine:3.19

# Import from builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /build/api /app/api
COPY --from=builder /build/migrations /app/migrations

# Use non-root user
USER appuser

WORKDIR /app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/api"]
```

### Docker Compose (Development)

```yaml
# deployments/docker/docker-compose.yml

version: "3.9"

services:
  api:
    build:
      context: ../..
      dockerfile: deployments/docker/Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://xcord:xcord@postgres:5432/xcord?sslmode=disable
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENV=development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - xcord

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: xcord
      POSTGRES_PASSWORD: xcord
      POSTGRES_DB: xcord
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U xcord"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - xcord

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - xcord

  migrate:
    image: migrate/migrate:v4.17.0
    volumes:
      - ../../migrations:/migrations
    command: [
      "-path", "/migrations",
      "-database", "postgres://xcord:xcord@postgres:5432/xcord?sslmode=disable",
      "up"
    ]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - xcord

volumes:
  postgres_data:
  redis_data:

networks:
  xcord:
    driver: bridge
```

### Docker Compose (Production)

```yaml
# deployments/docker/docker-compose.prod.yml

version: "3.9"

services:
  api:
    image: gcr.io/xcord/api:${VERSION}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_PRIVATE_KEY_PATH=/secrets/jwt_private.pem
      - JWT_PUBLIC_KEY_PATH=/secrets/jwt_public.pem
      - ENV=production
    secrets:
      - jwt_private_key
      - jwt_public_key
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

secrets:
  jwt_private_key:
    external: true
  jwt_public_key:
    external: true
```

---

## Kubernetes Deployment

### Namespace

```yaml
# deployments/k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: xcord
  labels:
    name: xcord
```

### ConfigMap

```yaml
# deployments/k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: xcord-api-config
  namespace: xcord
data:
  ENV: "production"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  HTTP_PORT: "8080"
  HTTP_READ_TIMEOUT: "10s"
  HTTP_WRITE_TIMEOUT: "30s"
```

### Secret

```yaml
# deployments/k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: xcord-api-secrets
  namespace: xcord
type: Opaque
stringData:
  DATABASE_URL: "postgres://user:pass@postgres:5432/xcord?sslmode=require"
  REDIS_URL: "redis://:pass@redis:6379"
  JWT_PRIVATE_KEY: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
  JWT_PUBLIC_KEY: |
    -----BEGIN PUBLIC KEY-----
    ...
    -----END PUBLIC KEY-----
```

### Deployment

```yaml
# deployments/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xcord-api
  namespace: xcord
  labels:
    app: xcord-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: xcord-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: xcord-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: xcord-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: api
          image: gcr.io/xcord/api:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
              protocol: TCP
          envFrom:
            - configMapRef:
                name: xcord-api-config
            - secretRef:
                name: xcord-api-secrets
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - xcord-api
                topologyKey: kubernetes.io/hostname
```

### Service

```yaml
# deployments/k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: xcord-api
  namespace: xcord
  labels:
    app: xcord-api
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: xcord-api
```

### Ingress

```yaml
# deployments/k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: xcord-api
  namespace: xcord
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: xcord-api
spec:
  tls:
    - hosts:
        - api.xcord.dev
      secretName: xcord-api-tls
  rules:
    - host: api.xcord.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: xcord-api
                port:
                  number: 80
```

### HorizontalPodAutoscaler

```yaml
# deployments/k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: xcord-api
  namespace: xcord
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: xcord-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  GO_VERSION: "1.23"
  REGISTRY: gcr.io
  IMAGE_NAME: xcord/api

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      
      - name: Run tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test?sslmode=disable
          REDIS_URL: redis://localhost:6379
        run: |
          go test -v -race -coverprofile=coverage.txt -covermode=atomic ./...
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.txt

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./deployments/docker/Dockerfile
          push: false
          tags: ${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
      
      - name: Configure Docker
        run: gcloud auth configure-docker gcr.io
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./deployments/docker/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
      
      - name: Deploy to GKE
        run: |
          gcloud container clusters get-credentials xcord-cluster --zone us-central1-a
          kubectl set image deployment/xcord-api api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} -n xcord
          kubectl rollout status deployment/xcord-api -n xcord
```

---

## Environment Configuration

### Environment Variables

```bash
# .env.example

# Server
ENV=development
HTTP_PORT=8080
HTTP_READ_TIMEOUT=10s
HTTP_WRITE_TIMEOUT=30s

# Database
DATABASE_URL=postgres://xcord:xcord@localhost:5432/xcord?sslmode=disable
DATABASE_MAX_OPEN_CONNS=25
DATABASE_MAX_IDLE_CONNS=5
DATABASE_CONN_MAX_LIFETIME=5m

# Redis
REDIS_URL=redis://localhost:6379
REDIS_MAX_RETRIES=3
REDIS_POOL_SIZE=10

# JWT
JWT_PRIVATE_KEY_PATH=./keys/jwt_private.pem
JWT_PUBLIC_KEY_PATH=./keys/jwt_public.pem
JWT_ACCESS_TOKEN_DURATION=15m
JWT_REFRESH_TOKEN_DURATION=168h

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:1420

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# Monitoring
METRICS_ENABLED=true
TRACING_ENABLED=false
SENTRY_DSN=
```

### Configuration Loading

```go
// internal/config/config.go
package config

import (
    "os"
    "time"
    
    "github.com/joho/godotenv"
)

type Config struct {
    Env  string
    HTTP HTTPConfig
    DB   DatabaseConfig
    Redis RedisConfig
    JWT  JWTConfig
    CORS CORSConfig
    Log  LogConfig
}

type HTTPConfig struct {
    Port         string
    ReadTimeout  time.Duration
    WriteTimeout time.Duration
}

type DatabaseConfig struct {
    URL             string
    MaxOpenConns    int
    MaxIdleConns    int
    ConnMaxLifetime time.Duration
}

type RedisConfig struct {
    URL        string
    MaxRetries int
    PoolSize   int
}

type JWTConfig struct {
    PrivateKeyPath       string
    PublicKeyPath        string
    AccessTokenDuration  time.Duration
    RefreshTokenDuration time.Duration
}

type CORSConfig struct {
    AllowedOrigins []string
}

type LogConfig struct {
    Level  string
    Format string
}

func Load() (*Config, error) {
    // Load .env in development
    if os.Getenv("ENV") != "production" {
        godotenv.Load()
    }
    
    return &Config{
        Env: getEnv("ENV", "development"),
        HTTP: HTTPConfig{
            Port:         getEnv("HTTP_PORT", "8080"),
            ReadTimeout:  getDuration("HTTP_READ_TIMEOUT", 10*time.Second),
            WriteTimeout: getDuration("HTTP_WRITE_TIMEOUT", 30*time.Second),
        },
        DB: DatabaseConfig{
            URL:             mustGetEnv("DATABASE_URL"),
            MaxOpenConns:    getInt("DATABASE_MAX_OPEN_CONNS", 25),
            MaxIdleConns:    getInt("DATABASE_MAX_IDLE_CONNS", 5),
            ConnMaxLifetime: getDuration("DATABASE_CONN_MAX_LIFETIME", 5*time.Minute),
        },
        Redis: RedisConfig{
            URL:        mustGetEnv("REDIS_URL"),
            MaxRetries: getInt("REDIS_MAX_RETRIES", 3),
            PoolSize:   getInt("REDIS_POOL_SIZE", 10),
        },
        JWT: JWTConfig{
            PrivateKeyPath:       mustGetEnv("JWT_PRIVATE_KEY_PATH"),
            PublicKeyPath:        mustGetEnv("JWT_PUBLIC_KEY_PATH"),
            AccessTokenDuration:  getDuration("JWT_ACCESS_TOKEN_DURATION", 15*time.Minute),
            RefreshTokenDuration: getDuration("JWT_REFRESH_TOKEN_DURATION", 168*time.Hour),
        },
        CORS: CORSConfig{
            AllowedOrigins: getSlice("CORS_ALLOWED_ORIGINS", ","),
        },
        Log: LogConfig{
            Level:  getEnv("LOG_LEVEL", "info"),
            Format: getEnv("LOG_FORMAT", "json"),
        },
    }, nil
}
```

---

*Sonraki: [Testing](./08-testing.md)*
