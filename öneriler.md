# XC Analiz ve İyileştirme Önerileri

Bu rapor, XC uygulamasının mevcut mimarisi ile Discord ve Instagram'ın dünya standartlarındaki mimarileri arasındaki farkları analiz eder.

> **Son Güncelleme:** 25 Aralık 2024 - React Query entegrasyonu tamamlandı

---

## 1. Mimari Karşılaştırma Özeti

| Özellik | Discord/Instagram | XC (Mevcut) |
| :--- | :--- | :--- |
| **Backend** | Distributed | Monolithic (Go/PostgreSQL) |
| **Real-time** | Event-Driven Gateway | Hibrit (WS + REST) |
| **Yetki** | Bitwise RBAC | ✅ **RBAC 2.0 TAMAMLANDI** |
| **Kanal Yapısı** | Kategoriler | ✅ **parent_id TAMAMLANDI** |
| **Sosyal Grafik** | Directed Graph + Status | ✅ **TAMAMLANDI** |
| **Feed** | Push Model (Fan-out) | Pull Model |
| **Voice/Video** | WebRTC + SFU | ✅ **LiveKit ENTEGRE** |

---

## 2. ✅ Tamamlanan Öneriler

### A. RBAC 2.0 (Backend + Frontend) - **TAMAMLANDI**

**Backend:**
- `roles` tablosu: `permissions` BIGINT (bitwise flags)
- `member_roles` junction tablosu
- `permission_overwrites` tablosu
- `PermissionEngine` hiyerarşik hesaplama

**Frontend:**
- `Role` interface, `Permissions` sabitleri
- `hasPermission()`, `hasAnyPermission()` yardımcıları
- `MembersModal` dinamik rol gösterimi

---

### B. Sosyal Grafik (Instagram-Style) - **TAMAMLANDI**

**Database:**
- `follows.status` kolonu: `active`, `pending`, `blocked`
- `users.followers_count`, `following_count`, `posts_count` denormalized counters

**Backend:**
- `FollowStatus` type (domain layer)
- Privacy-aware `Follow()`: public=active, private=pending
- `AcceptFollowRequest()`, `RejectFollowRequest()`, `BlockUser()`
- Transaction-based counter increment/decrement

**API Endpoints:**
- `GET /me/follow-requests` - Bekleyen istekler
- `POST /me/follow-requests/:id/accept` - Onayla
- `POST /me/follow-requests/:id/reject` - Reddet
- `POST /users/:id/block` - Engelle

**Frontend:**
- `NotificationsPage.tsx` - Takip istekleri bölümü
- Onayla/Reddet butonları
- "X seni takip etmeye başladı" mesajı

---

### C. Performans Optimizasyonları - **TAMAMLANDI**

| Görev | Durum | Açıklama |
|:---|:---:|:---|
| List Virtualization | ✅ | @tanstack/react-virtual |
| Redis Cache | ✅ | Profil ve sayaçlar için |
| Lazy Guilds | ✅ | Server list virtualization |
| Skeleton Screens | ✅ | Algılanan performans |
| Read State Service | ✅ | Okunmamış sayaç servisi |

---

## 3. 🚀 Yeni İyileştirme Önerileri

### A. Frontend İyileştirmeleri

#### 1. State Management Güçlendirmesi
| Öneri | Mevcut | Önerilen | Öncelik |
|:---|:---|:---|:---:|
| **Query Caching** | Manuel fetch | TanStack Query (React Query) | ✅ **TAMAMLANDI** |
| **Optimistic Updates** | Yok | TanStack Query mutations | ✅ **TAMAMLANDI** |
| **Real-time Sync** | Manuel WebSocket | useRealtimeSync hook | ✅ **TAMAMLANDI** |

```typescript
// Önerilen: React Query entegrasyonu
// Avantajlar: Cache, Refetch, Optimistic Updates, Infinite Queries
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useChannelMessages(channelId: string) {
    return useInfiniteQuery({
        queryKey: ['messages', channelId],
        queryFn: ({ pageParam }) => fetchMessages(channelId, pageParam),
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 1000 * 60 * 5, // 5 dakika
    });
}
```

#### 2. ServersPage React Query Entegrasyonu ✅ (25 Aralık 2024)
| Öğe | Durum | Açıklama |
|:---|:---:|:---|
| `useServerData` hook | ✅ | `useServers`, `useChannels` ile çalışıyor |
| `useChannelMessages` hook | ✅ | `useChannelMessagesQuery` wrapper |
| Optimistic Updates | ✅ | Mesaj gönderme anında görünür |
| WebSocket → Cache Sync | ✅ | `useRealtimeSync` hook |

#### 3. Component Performansı
| Öneri | Açıklama | Öncelik |
|:---|:---|:---:|
| **React.memo** stratejisi | Large lists için memoization | 🔴 P1 |
| **useDeferredValue** | Heavy UI güncellemelerinde | 🟡 P2 |
| **Suspense boundaries** | Code splitting için | 🟡 P2 |
| **Error boundaries** | Daha iyi hata yönetimi | 🟡 P2 |

#### 3. CSS/Styling İyileştirmeleri
| Öneri | Mevcut | Önerilen | Öncelik |
|:---|:---|:---|:---:|
| **CSS Variables** | Inline styles | Design tokens | 🟡 P2 |
| **Animation Library** | CSS transitions | Framer Motion | 🟢 P3 |
| **Dark/Light Theme** | Sadece dark | Tema sistemi | 🟢 P3 |

---

### B. Backend İyileştirmeleri

#### 1. API Güvenliği
| Öneri | Mevcut | Önerilen | Öncelik |
|:---|:---|:---|:---:|
| **Rate Limiting** | Basit | Token bucket + IP bazlı | 🔴 P1 |
| **Request Validation** | go-playground/validator | + Custom rules | 🟡 P2 |
| **API Versioning** | /v1 | Header-based versioning | 🟢 P3 |

```go
// Önerilen: Gelişmiş Rate Limiting
type RateLimiter struct {
    redis *redis.Client
    rules map[string]RateRule
}

type RateRule struct {
    Endpoint string
    Limit    int
    Window   time.Duration
    ByUser   bool // IP yerine user bazlı
}
```

#### 2. Observability (İzlenebilirlik)
| Öneri | Açıklama | Öncelik |
|:---|:---|:---:|
| **Structured Logging** | JSON formatında loglar (zerolog/zap) | 🔴 P1 |
| **Request Tracing** | OpenTelemetry entegrasyonu | 🟡 P2 |
| **Metrics** | Prometheus endpoint | 🟡 P2 |
| **Health Checks** | /health, /ready endpoints | 🔴 P1 |

#### 3. Database Optimizasyonları
| Öneri | Mevcut | Önerilen | Öncelik |
|:---|:---|:---|:---:|
| **Connection Pooling** | pgx default | Tuned pool settings | 🔴 P1 |
| **Query Caching** | Yok | Redis + invalidation | 🟡 P2 |
| **Read Replicas** | Yok | pg_bouncer + replicas | 🟢 P3 |

---

### C. Altyapı Önerileri

#### 1. Deployment & DevOps
| Öneri | Mevcut | Önerilen | Öncelik |
|:---|:---|:---|:---:|
| **CI/CD Pipeline** | Manuel | GitHub Actions | 🔴 P1 |
| **Containerization** | Docker Compose | + K8s manifests | 🟡 P2 |
| **Environment Configs** | .env | Secret management (Vault) | 🟡 P2 |

#### 2. Testing Altyapısı
| Öneri | Mevcut | Önerilen | Öncelik |
|:---|:---|:---|:---:|
| **Backend Unit Tests** | Kısıtlı | %80+ coverage | 🔴 P1 |
| **Integration Tests** | Yok | Testcontainers | 🔴 P1 |
| **Frontend Tests** | Yok | Vitest + Testing Library | 🟡 P2 |
| **E2E Tests** | Yok | Playwright | 🟢 P3 |

---

### D. Özellik Bazlı İyileştirmeler

#### 1. Voice/Video (LiveKit)
| Öneri | Durum | Açıklama |
|:---|:---:|:---|
| **Noise Suppression** | 📋 | Krisp benzeri gürültü engelleme |
| **Screen Sharing** | 📋 | Ekran paylaşımı desteği |
| **Virtual Background** | 📋 | Arka plan bulanıklaştırma |
| **Recording** | 📋 | Kayıt özelliği (Egress) |

#### 2. Mesajlaşma
| Öneri | Durum | Açıklama |
|:---|:---:|:---|
| **Rich Text Editor** | 📋 | Markdown + embeds |
| **Message Reactions** | 📋 | Emoji reactions |
| **Message Threads** | 📋 | Thread replies |
| **File Attachments** | 📋 | Dosya paylaşımı |
| **Message Search** | 📋 | Full-text search |

#### 3. Moderasyon
| Öneri | Durum | Açıklama |
|:---|:---:|:---|
| **Audit Log** | 📋 | Admin eylemlerinin kaydı |
| **Auto-mod** | 📋 | Spam/link filtresi |
| **User Reports** | 📋 | Şikayet sistemi |
| **Timed Bans** | 📋 | Geçici yasaklar |

---

## 4. 💡 Uygulama İsmi Önerileri

Mevcut isim **XCORD** veya **XC** olarak geçiyor. İsim değişikliği için analiz:

### "Fact" İsmi Değerlendirmesi

| Kriter | Değerlendirme | Puan |
|:---|:---|:---:|
| **Kısalık** | 4 harf, akılda kalıcı | ⭐⭐⭐⭐⭐ |
| **Özgünlük** | Yaygın bir kelime, domain zorlukları olabilir | ⭐⭐ |
| **Anlam** | "Gerçek" - topluluk/güven çağrışımı | ⭐⭐⭐ |
| **SEO** | "fact" çok genel bir kelime | ⭐⭐ |
| **Marka Uyumu** | Gaming/Sosyal platform için zayıf | ⭐⭐ |

### Alternatif İsim Önerileri

| İsim | Anlam | Domain Uygunluğu | Öneri |
|:---|:---|:---:|:---:|
| **Nexus** | Bağlantı noktası | ✅ nexus.gg | ⭐⭐⭐⭐ |
| **Pulse** | Nabız, canlılık | ✅ pulse.chat | ⭐⭐⭐⭐ |
| **Orbit** | Yörünge, topluluk | ✅ orbit.app | ⭐⭐⭐⭐⭐ |
| **Faction** | "Fact" + "Action" | ✅ faction.gg | ⭐⭐⭐⭐⭐ |
| **Flux** | Akış, değişim | ✅ flux.chat | ⭐⭐⭐⭐ |
| **Vex** | Kısa, güçlü | ✅ vex.gg | ⭐⭐⭐⭐ |
| **Crux** | Öz, kritik nokta | ✅ crux.app | ⭐⭐⭐⭐ |

### En İyi Öneri: **Faction**

> [!TIP]
> **Faction** ismi "Fact" fikrinden türetilmiş ve daha güçlü bir markaya sahip:
> - Gaming terminolojisinde anlamlı (Guild, Clan, Faction)
> - 7 harf, telaffuzu kolay
> - "Faction" = Grup, Topluluk
> - Domain seçenekleri: faction.gg, faction.chat, factionapp.com

---

## 5. Yol Haritası Özeti

### 🔴 Öncelik 1 - Kritik (1-2 Hafta)

| Görev | Açıklama |
|:---|:---|
| React Query entegrasyonu | Cache + optimistic updates |
| Structured logging | zerolog/zap kurulumu |
| Health endpoints | /health, /ready |
| Rate limiting | Token bucket implementasyonu |
| CI/CD pipeline | GitHub Actions setup |

### 🟡 Öncelik 2 - Önemli (3-4 Hafta)

| Görev | Açıklama |
|:---|:---|
| Unit test coverage | %80+ hedef |
| OpenTelemetry | Request tracing |
| Error boundaries | React hata yönetimi |
| Redis query cache | Database yük azaltma |

### 🟢 Öncelik 3 - Nice to Have (5+ Hafta)

| Görev | Açıklama |
|:---|:---|
| Theme system | Dark/Light mode |
| Framer Motion | Smooth animasyonlar |
| E2E tests | Playwright |
| Read replicas | Yüksek traffic için |

---

## 6. Roadmap Entegrasyonu

Mevcut roadmap dosyaları ile koordinasyon:

| Roadmap | Durum | Öncelik |
|:---|:---:|:---:|
| `overlay_roadmap.md` | 📋 Planlanıyor | 🔴 P1 |
| `live_roadmap.md` | 📋 Planlanıyor | 🟡 P2 |
| `LIVEKIT_INTEGRATION_PLAN.md` | ✅ Plan Hazır | 🔴 P1 |

> [!IMPORTANT]
> Overlay sistemi (Xbox Game Bar benzeri) XC'nin **benzersiz özelliği** olacak. PiP Video Widgets özelliği öncelikli olarak geliştirilmeli.

---

## 7. Teknik Borç Listesi

| Alan | Borç | Öncelik |
|:---|:---|:---:|
| **Testing** | Test coverage eksik | 🔴 Kritik |
| **Error Handling** | Merkezi error handling yok | 🔴 Kritik |
| **Documentation** | API docs eksik (Swagger/OpenAPI) | 🟡 Orta |
| **Type Safety** | Backend type assertions | 🟡 Orta |
| **Code Style** | Linting rules eksik | 🟢 Düşük |

---

> [!NOTE]
> XC'nin mevcut **Clean Architecture** yapısı iyileştirmeler için sağlam bir temel sunuyor. RBAC 2.0, Sosyal Grafik ve performans optimizasyonları tamamlandı. Sıradaki öncelik: Testing altyapısı, observability ve overlay sistemi.
