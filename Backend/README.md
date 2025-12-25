# XCORD Backend

> Discord + Twitter Hibrid Sosyal Platform | Go Backend

---

## 🚀 Hızlı Başlangıç

### Prerequisites

- Go 1.23+
- Docker & Docker Compose
- Make

### Development Setup

```bash
# Clone repository
git clone https://github.com/xcord/backend.git
cd backend

# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis)
docker compose up -d

# Run migrations
make migrate-up

# Start development server (hot reload)
make dev
```

### API Access

```
http://localhost:8080/api/v1
```

---

## 📁 Project Structure

```
Backend/
├── cmd/                    # Application entrypoints
│   ├── api/               # HTTP API server
│   └── worker/            # Background job worker
├── internal/              # Private application code
│   ├── domain/            # Business entities & rules
│   ├── application/       # Use cases & services
│   ├── adapters/          # HTTP, WebSocket, Workers
│   └── infrastructure/    # Database, Cache, External services
├── migrations/            # Database migrations
├── deployments/           # Docker, Kubernetes
├── docs/                  # Documentation
└── tests/                 # Integration & E2E tests
```

---

## 📚 Documentation

| Doküman | Açıklama |
|---------|----------|
| [01-project-overview.md](./docs/01-project-overview.md) | Proje genel bakış |
| [02-architecture.md](./docs/02-architecture.md) | Mimari tasarım |
| [03-api-specification.md](./docs/03-api-specification.md) | API endpoint'leri |
| [04-database-design.md](./docs/04-database-design.md) | Veritabanı şeması |
| [05-security.md](./docs/05-security.md) | Güvenlik |
| [06-real-time.md](./docs/06-real-time.md) | WebSocket & Real-time |
| [07-deployment.md](./docs/07-deployment.md) | Deployment |
| [08-testing.md](./docs/08-testing.md) | Test stratejisi |
| [09-monitoring.md](./docs/09-monitoring.md) | Monitoring |
| [10-development-roadmap.md](./docs/10-development-roadmap.md) | Geliştirme planı |

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Language | Go 1.23+ |
| Framework | Fiber v2 |
| Database | PostgreSQL 16+ |
| Cache | Redis 7+ |
| ORM | sqlc + pgx |
| Auth | JWT (RS256) |
| Real-time | WebSocket (gorilla) |
| Monitoring | Prometheus + Grafana |

---

## 🔧 Commands

```bash
# Development
make dev          # Start with hot reload
make build        # Build binary
make test         # Run tests
make lint         # Run linter

# Database
make migrate-up   # Apply migrations
make migrate-down # Rollback last migration
make migrate-create name=NAME # Create new migration

# Docker
make docker-build # Build Docker image
make docker-push  # Push to registry
```

---

## 📊 API Overview

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Core
- `GET /me` - Current user
- `GET /servers` - Server list
- `GET /friends` - Friend list

### Feed
- `GET /feed` - Timeline
- `POST /posts` - Create post
- `POST /posts/:id/like` - Like toggle

### DM
- `GET /dm/conversations` - Conversations
- `GET /dm/conversations/:id/messages` - Message history
- `POST /dm/conversations/:id/messages` - Send message

### Servers
- `GET /servers/:id/channels` - Channels
- `GET /servers/:id/members` - Members
- `POST /servers/:id/channels/:chId/messages` - Channel message

### Live
- `GET /live/streams` - Stream list
- `POST /live/streams` - Go live
- `GET /live/streams/:id/chat` - Live chat

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built with ❤️ using Go*
