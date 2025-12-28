# Pink Backend - Proje Genel Bakış

> Versiyon: 1.2 | Son Güncelleme: 2025-12-28 | Go 1.23+

---

## 🚀 Güncel Durum

| Bileşen | Durum | Notlar |
|---------|-------|--------|
| **Authentication** | ✅ Çalışıyor | JWT RS256, Register/Login/Refresh/Logout |
| **User API** | ✅ Çalışıyor | Profil, Takip Sistemi, Gizlilik Ayarları |
| **Servers & Channels** | ✅ Çalışıyor | Sunucu-Kanal yapısı, Rol/İzin sistemi |
| **Feed & Wall** | ✅ Çalışıyor | Global Feed, Sunucu Duvarı, Post Etkileşimleri |
| **Real-time (Message)** | ✅ Çalışıyor | WebSocket tabanlı mesajlaşma ve bildirimler |
| **Live Streaming** | ✅ Çalışıyor | LiveKit & OvenMediaEngine entegrasyonu |
| **Voice/Video Call** | ✅ Çalışıyor | WebRTC (LiveKit) tabanlı sesli kanallar ve 1v1 aramalar |
| **Database** | ✅ Bağlı | PostgreSQL 16 (Primary), Redis 7 (Cache/Worker) |

---

## 📋 İçindekiler

1. [Proje Hakkında](#proje-hakkında)
2. [Teknoloji Seçimleri](#teknoloji-seçimleri)
3. [Mimari Yaklaşım](#mimari-yaklaşım)
4. [Geliştirme İlkeleri](#geliştirme-ilkeleri)
5. [Dokümantasyon Yapısı](#dokümantasyon-yapısı)

---

## Proje Hakkında

Pink, modern sosyal etkileşim ihtiyaçlarını karşılayan, **Discord + Twitter hibrid** bir sosyal iletişim platformudur. Backend, yüksek ölçeklenebilirlik ve düşük gecikme süresi hedeflenerek tasarlanmıştır.

### Ana Modüller

| Modül | Açıklama | Durum |
|-------|----------|-------|
| **Auth** | JWT tabanlı kimlik doğrulama, Session yönetimi | ✅ |
| **Servers** | Discord tarzı sunucu, kategori ve kanal yapısı | ✅ |
| **Feed** | Twitter tarzı post, like, repost ve global akış | ✅ |
| **DM** | Birebir mesajlaşma, anlık durum takibi | ✅ |
| **Live** | Düşük gecikmeli canlı yayın (LL-HLS/WebRTC) | ✅ |
| **Voice** | Grup sesli kanalları ve özel aramalar | ✅ |
| **Security** | RBAC, Gizlilik ayarları, Moderasyon | ✅ |

### Hedef Metrikler

| Metrik | Hedef |
|--------|-------|
| API Yanıt Süresi (p99) | < 100ms |
| Concurrent Users | 10,000+ |
| Real-time Latency | < 50ms |
| Uptime | 99.9% |

---

## Teknoloji Seçimleri

### Core Stack

| Kategori | Teknoloji | Gerekçe |
|----------|-----------|---------|
| **Dil** | Go 1.23+ | Performans, concurrency (Goroutines), tip güvenliği |
| **HTTP Framework** | Fiber v2 | Express benzeri yapı, yüksek throughput, zengin middleware |
| **Database** | PostgreSQL 16 | ACID uyumu, JSONB desteği, güçlü ilişkisel model |
| **Cache/PubSub** | Redis 7 | Hızlı veri erişimi, rate limiting, WS synchronization |
| **Streaming** | LiveKit / OME | Profesyonel WebRTC ve LL-HLS altyapısı |
| **Real-time** | WebSocket | Çift yönlü anlık iletişim |

### Neden Go 1.23?

Proje, Go'nun en güncel özelliklerinden faydalanır:
- **Range-over-func**: Daha temiz iteratör desenleri.
- **Improved Loop Variables**: Goroutine'lerdeki closure güvenliği.
- **Enhanced Net/HTTP**: Daha esnek routing (her ne kadar Fiber kullanılsa da standart kütüphane optimize edilmiştir).

---

## Mimari Yaklaşım

### Clean Architecture (Hexagonal)

Pink Backend, iş mantığını dış dünyadan (DB, API, external SDKs) izole eden **Hexagonal Architecture** prensiplerini uygular:

1.  **Domain (Core)**: Entities, value objects ve repo interface'leri.
2.  **Application**: Use-case logic (Services).
3.  **Adapters**: HTTP Handlers, WebSocket Gateway, DB Implementations.
4.  **Infrastructure**: Config, Logger, Auth Providers (JWT/LiveKit).

---

## Geliştirme İlkeleri

### 1. Explicit Error Handling
Magic exception'lar yerine hatalar fonksiyonların bir parçasıdır.
```go
if err := s.repo.Create(ctx, data); err != nil {
    return fmt.Errorf("create failed: %w", err)
}
```

### 2. Dependency Injection
Tüm bağımlılıklar constructor'lar (NewService, NewHandler) aracılığıyla enjekte edilir, bu da test edilebilirliği artırır.

### 3. Concurrency via Channels
Veri paylaşmak yerine mesajlaşma (CSP) yaklaşımı tercih edilir.

---

## Dokümantasyon Yapısı

| Dosya | Açıklama |
|-------|----------|
| [02-architecture.md](./02-architecture.md) | Detaylı mimari şema ve katman yapısı |
| [03-api-specification.md](./03-api-specification.md) | Endpoint listesi ve DTO tanımları |
| [04-database-design.md](./04-database-design.md) | Tablo ilişkileri ve migration detayları |
| [05-security.md](./05-security.md) | Auth akışı ve güvenlik önlemleri |
| [06-real-time.md](./06-real-time.md) | WebSocket protokolü ve event listesi |
| [07-deployment.md](./07-deployment.md) | Docker & Environment yapılandırması |
| [08-testing.md](./08-testing.md) | Test stratejisi ve çalıştırma kılavuzu |
| [09-monitoring.md](./09-monitoring.md) | Logging ve observability |
| [10-development-roadmap.md](./10-development-roadmap.md) | Gelecek özellikler ve planlar |

---

*Pink Backend, "Social Interactive Communication" vizyonuyla geliştirilmektedir.*
