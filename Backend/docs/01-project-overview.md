# XCORD Backend - Proje Genel Bakış

> Versiyon: 1.1 | Son Güncelleme: 2025-12-21 | Go 1.23+

---

## 🚀 Güncel Durum

| Bileşen | Durum | Notlar |
|---------|-------|--------|
| **Authentication** | ✅ Çalışıyor | JWT RS256, register/login/refresh/logout |
| **User API** | ✅ Çalışıyor | GET /me |
| **PostgreSQL** | ✅ Bağlı | users, user_sessions tabloları |
| **Redis** | ✅ Bağlı | Cache ve session için hazır |
| **Unit Tests** | ✅ 11 Geçti | Password, JWT, Entity testleri |

---

## 📋 İçindekiler

1. [Proje Hakkında](#proje-hakkında)
2. [Teknoloji Seçimleri](#teknoloji-seçimleri)
3. [Mimari Yaklaşım](#mimari-yaklaşım)
4. [Geliştirme İlkeleri](#geliştirme-ilkeleri)
5. [Dokümantasyon Yapısı](#dokümantasyon-yapısı)

---

## Proje Hakkında

XCORD, **Discord + Twitter hibrid** bir sosyal platformdur. Backend, aşağıdaki ana modülleri destekleyecek şekilde tasarlanacaktır:

| Modül | Açıklama | Öncelik |
|-------|----------|---------|
| **Auth** | JWT tabanlı kimlik doğrulama, OAuth2 | P0 |
| **Feed** | Twitter tarzı timeline, post, etkileşimler | P0 |
| **DM** | Birebir mesajlaşma, read receipts | P0 |
| **Servers** | Discord tarzı sunucu-kanal yapısı | P0 |
| **Live** | Canlı yayın sistemi (RTMP/HLS) | P1 |
| **Notifications** | Bildirim merkezi, push notifications | P1 |
| **Voice** | WebRTC tabanlı sesli sohbet | P2 |
| **Search** | Full-text arama | P2 |

### Hedef Metrikler

| Metrik | Hedef |
|--------|-------|
| API Yanıt Süresi (p99) | < 100ms |
| Concurrent Users | 10,000+ |
| Message Throughput | 1,000 msg/sec |
| Uptime | 99.9% |

---

## Teknoloji Seçimleri

### Core Stack

| Kategori | Teknoloji | Gerekçe |
|----------|-----------|---------|
| **Dil** | Go 1.23+ | Performans, concurrency, statik binary, cloud-native uyumluluk |
| **HTTP Framework** | Fiber v2 / Chi | Yüksek performans, middleware desteği, minimal footprint |
| **Database (Primary)** | PostgreSQL 16+ | ACID, karmaşık sorgular, JSONB, full-text search |
| **Database (Cache)** | Redis 7+ | Session, cache, rate limiting, pub/sub |
| **ORM/Query** | sqlc + pgx | Type-safe SQL, yüksek performans, tam kontrol |
| **Real-time** | WebSocket (gorilla/websocket) | DM, notifications, presence |
| **Auth** | JWT (RS256) + Refresh Tokens | Stateless, scalable |

### Go 1.23 Yeni Özellikler (Kullanılacak)

```go
// Iterator Functions - Koleksiyon işlemleri için
for user := range users.All() {
    process(user)
}

// Improved Timer/Ticker - Memory leak önleme
timer := time.NewTimer(duration)
// Artık garbage collection için uygun

// For Loop Fix - Goroutine'lerde güvenli closure
for _, item := range items {
    go func() {
        process(item) // Go 1.22+ ile güvenli
    }()
}
```

### Neden Bu Teknolojiler?

#### Go vs Diğer Diller (2025)

| Kriter | Go | Node.js | Rust |
|--------|-----|---------|------|
| Öğrenme Eğrisi | Kolay | Kolay | Zor |
| Performans | Çok Yüksek | Orta | En Yüksek |
| Concurrency | Native (Goroutines) | Event Loop | Native |
| Binary Size | Küçük | N/A | Küçük |
| Compile Time | Hızlı | N/A | Yavaş |
| Ekosistem | Olgun | Çok Geniş | Büyüyen |

#### PostgreSQL vs MongoDB

| Kriter | PostgreSQL | MongoDB |
|--------|------------|---------|
| Use Case | Relational, ACID | Document, flexible schema |
| Query Complexity | Mükemmel | Sınırlı JOIN |
| Transactions | Native | Kısıtlı |
| Full-text Search | Native | Atlas Search |
| **XCORD için** | ✅ Tercih | Değerlendirilmedi |

**Karar:** XCORD'un ilişkisel yapısı (users, servers, channels, messages) PostgreSQL'i ideal kılar.

---

## Mimari Yaklaşım

### Clean Architecture (Hexagonal)

```
┌─────────────────────────────────────────────────────────────┐
│                      External World                         │
│  (HTTP, WebSocket, gRPC, CLI, Cron Jobs)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     ADAPTERS (Ports)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  HTTP API   │  │  WebSocket  │  │   Workers   │         │
│  │  (Handlers) │  │  (Gateway)  │  │   (Jobs)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     APPLICATION LAYER                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Use Cases                         │   │
│  │  (CreatePost, SendMessage, JoinServer, StartStream) │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      DOMAIN LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Entities   │  │    Values    │  │  Interfaces  │      │
│  │ (User, Post) │  │ (Email, ID)  │  │ (Repository) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │   Redis     │  │ S3/MinIO    │         │
│  │ Repository  │  │   Cache     │  │  Storage    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Katman Sorumlulukları

| Katman | Sorumluluk | Örnek |
|--------|------------|-------|
| **Domain** | İş kuralları, entities, value objects | `User`, `Post`, `Server` |
| **Application** | Use case orchestration | `CreatePostUseCase` |
| **Adapters** | Dış dünya ile iletişim | HTTP handlers, WS |
| **Infrastructure** | Teknik detaylar | DB queries, cache |

### Dependency Rule

```
Domain ← Application ← Adapters ← Infrastructure
         (Bağımlılık yönü: içeriden dışarıya)
```

- **Domain** hiçbir katmana bağımlı değil
- **Application** sadece Domain'e bağımlı
- **Adapters** Application ve Domain'e bağımlı
- **Infrastructure** tüm katmanlara bağımlı olabilir

---

## Geliştirme İlkeleri

### 1. Go Idiomları

```go
// ✅ Doğru: Explicit error handling
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething failed: %w", err)
}

// ✅ Doğru: Table-driven tests
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 1, 2, 3},
        {"negative", -1, -2, -3},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.expected {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}

// ✅ Doğru: Context propagation
func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
    return s.repo.FindByID(ctx, id)
}
```

### 2. Concurrency Best Practices

```go
// Worker Pool Pattern
func ProcessItems(ctx context.Context, items []Item, workers int) error {
    g, ctx := errgroup.WithContext(ctx)
    itemCh := make(chan Item, len(items))
    
    // Producer
    go func() {
        defer close(itemCh)
        for _, item := range items {
            select {
            case itemCh <- item:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // Workers
    for i := 0; i < workers; i++ {
        g.Go(func() error {
            for item := range itemCh {
                if err := process(ctx, item); err != nil {
                    return err
                }
            }
            return nil
        })
    }
    
    return g.Wait()
}
```

### 3. Error Handling Standards

```go
// Domain errors
var (
    ErrUserNotFound     = errors.New("user not found")
    ErrInvalidEmail     = errors.New("invalid email format")
    ErrUnauthorized     = errors.New("unauthorized")
)

// Error wrapping
func (r *UserRepository) FindByID(ctx context.Context, id string) (*User, error) {
    user, err := r.db.QueryRow(ctx, query, id)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("query user by id: %w", err)
    }
    return user, nil
}
```

### 4. API Design Standards

- **RESTful** conventions
- **Versioned** endpoints (`/api/v1/...`)
- **Cursor-based** pagination
- **Consistent** error format
- **Idempotent** write operations

---

## Dokümantasyon Yapısı

```
Backend/docs/
├── 01-project-overview.md      # Bu dosya
├── 02-architecture.md          # Detaylı mimari
├── 03-api-specification.md     # OpenAPI/Swagger
├── 04-database-design.md       # Schema, indexler
├── 05-security.md              # Auth, güvenlik
├── 06-real-time.md             # WebSocket, events
├── 07-deployment.md            # Docker, K8s
├── 08-testing.md               # Test stratejisi
├── 09-monitoring.md            # Observability
└── 10-development-roadmap.md   # Geliştirme planı
```

---

## Sonraki Adımlar

1. ➡️ [Mimari Detayları](./02-architecture.md) okuyun
2. ➡️ [Development Roadmap](./10-development-roadmap.md) inceleyin
3. ➡️ Geliştirme ortamını kurun

---

*Bu doküman, XCORD Backend projesinin temelini oluşturur ve geliştirme sürecinde güncellenecektir.*
