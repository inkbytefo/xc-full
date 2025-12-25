.PHONY: dev build test lint clean migrate-up migrate-down migrate-create docker-build docker-up docker-down generate

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=xcord-api
BINARY_PATH=bin/$(BINARY_NAME)
GOOS := $(shell go env GOOS)
RACE_FLAG := -race

ifeq ($(GOOS),windows)
RACE_FLAG :=
endif

# Docker
DOCKER_COMPOSE=docker compose

# Database
DATABASE_URL ?= postgres://xcord:xcord@localhost:5432/xcord?sslmode=disable
MIGRATE=migrate -path ./migrations -database "$(DATABASE_URL)"

# Build flags
LDFLAGS=-ldflags "-s -w"

# ===== Development =====

dev:
	@echo "Starting development server..."
	@air

run:
	$(GOCMD) run ./cmd/api

# ===== Build =====

build:
	@echo "Building..."
	CGO_ENABLED=0 $(GOBUILD) $(LDFLAGS) -o $(BINARY_PATH) ./cmd/api

build-all: build
	@echo "Build complete: $(BINARY_PATH)"

# ===== Testing =====

test:
	$(GOTEST) -v $(RACE_FLAG) -cover ./...

test-coverage:
	$(GOTEST) -v $(RACE_FLAG) -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-integration:
	$(GOTEST) -v -tags=integration ./...

# ===== Linting =====

lint:
	$(GOCMD) run github.com/golangci/golangci-lint/cmd/golangci-lint@v1.64.8 run ./...

fmt:
	$(GOCMD) fmt ./...

vet:
	$(GOCMD) vet ./...

# ===== Dependencies =====

deps:
	$(GOMOD) download

tidy:
	$(GOMOD) tidy

# ===== Database Migrations =====

migrate-up:
	@echo "Running migrations..."
	$(MIGRATE) up

migrate-down:
	@echo "Rolling back last migration..."
	$(MIGRATE) down 1

migrate-drop:
	@echo "Dropping all migrations..."
	$(MIGRATE) drop -f

migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir ./migrations -seq $$name

migrate-status:
	$(MIGRATE) version

# ===== Docker =====

docker-up:
	$(DOCKER_COMPOSE) up -d

docker-down:
	$(DOCKER_COMPOSE) down

docker-logs:
	$(DOCKER_COMPOSE) logs -f

docker-build:
	docker build -t xcord-api:latest -f deployments/docker/Dockerfile .

docker-clean:
	$(DOCKER_COMPOSE) down -v --remove-orphans

# ===== Code Generation =====

generate:
	$(GOCMD) generate ./...

# ===== Clean =====

clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	$(GOCMD) clean -cache

# ===== Help =====

help:
	@echo "XCORD Backend Makefile Commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev              - Start development server with hot reload"
	@echo "  run              - Run without hot reload"
	@echo ""
	@echo "Build:"
	@echo "  build            - Build the application"
	@echo ""
	@echo "Testing:"
	@echo "  test             - Run all tests"
	@echo "  test-coverage    - Run tests with coverage report"
	@echo "  test-integration - Run integration tests"
	@echo ""
	@echo "Linting:"
	@echo "  lint             - Run golangci-lint"
	@echo "  fmt              - Format code"
	@echo "  vet              - Run go vet"
	@echo ""
	@echo "Database:"
	@echo "  migrate-up       - Apply all migrations"
	@echo "  migrate-down     - Rollback last migration"
	@echo "  migrate-create   - Create new migration"
	@echo "  migrate-status   - Show migration version"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up        - Start Docker containers"
	@echo "  docker-down      - Stop Docker containers"
	@echo "  docker-logs      - View Docker logs"
	@echo "  docker-build     - Build Docker image"
	@echo ""
	@echo "Other:"
	@echo "  deps             - Download dependencies"
	@echo "  tidy             - Tidy go.mod"
	@echo "  clean            - Clean build artifacts"
