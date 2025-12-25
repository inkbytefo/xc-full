# XCORD Platform Specification

> Backend Geliştirici Rehberi | v1.0 | 2025-12-21

Bu doküman, XCORD sosyal platformunun frontend'inde tasarlanan tüm özellikleri, veri modellerini, API sözleşmelerini ve backend implementasyonu için gereksinimleri detaylı olarak açıklar.

---

## 📋 İçindekiler

1. [Platform Genel Bakış](#platform-genel-bakış)
2. [Mimari Yapı](#mimari-yapı)
3. [Özellik Modülleri](#özellik-modülleri)
4. [Veri Modelleri](#veri-modelleri)
5. [API Endpoint Sözleşmesi](#api-endpoint-sözleşmesi)
6. [Placeholder Fonksiyonlar ve Gerçek İş Mantıkları](#placeholder-fonksiyonlar-ve-gerçek-iş-mantıkları)
7. [Real-time Gereksinimler](#real-time-gereksinimler)
8. [Öneriler ve Dikkat Edilmesi Gerekenler](#öneriler)

---

## Platform Genel Bakış

XCORD, Discord + Twitter hibrid bir sosyal platformdur. Kullanıcılar:

- **Feed**: Twitter tarzı genel akış, post paylaşma, etkileşimler
- **Servers**: Discord tarzı sunucu-kanal yapısı, metin ve ses kanalları
- **DM**: Birebir mesajlaşma sistemi
- **Live**: Twitch tarzı canlı yayın sistemi
- **Notifications**: Bildirim merkezi
- **Settings**: Kullanıcı ve uygulama ayarları

### Teknoloji Stack'i

| Alan | Teknoloji |
|------|-----------|
| Frontend | React + TypeScript + Tailwind CSS |
| Desktop Shell | Tauri v2 (Rust) |
| Backend (Planlanıyor) | Go |
| API Protocol | REST JSON (WebSocket for real-time) |

---

## Mimari Yapı

### Frontend Klasör Yapısı

```
src/
├── api/                    # API client ve tipler
│   ├── client.ts           # HTTP client (fetch wrapper)
│   ├── types.ts            # Tüm TypeScript tipleri
│   ├── userApi.ts          # Kullanıcı API fonksiyonları
│   └── mock/               # Mock API implementasyonu
├── components/             # Genel UI bileşenleri
│   ├── MainSidebar.tsx     # Ana navigasyon sidebar'ı
│   └── DotWaveCanvas.tsx   # Animasyonlu arka plan
├── features/               # Özellik modülleri
│   ├── feed/               # Timeline + Post sistemi
│   ├── dm/                 # Direkt mesajlaşma
│   ├── servers/            # Sunucu-kanal sistemi
│   ├── live/               # Canlı yayın sistemi
│   ├── notifications/      # Bildirimler
│   ├── settings/           # Ayarlar
│   └── profile/            # Profil sayfası
├── lib/                    # Yardımcı fonksiyonlar
│   ├── utils.ts            # Genel utilities (cn, vb.)
│   └── clientId.ts         # UUID generator (idempotency)
└── router.tsx              # React Router konfigürasyonu
```

### URL Yapısı

| URL | Açıklama |
|-----|----------|
| `/feed` | Ana akış / timeline |
| `/dms` | DM konuşma listesi |
| `/dms/:conversationId` | Belirli DM konuşması |
| `/servers` | Sunucu listesi |
| `/servers/:serverId` | Sunucu profili/ayarları |
| `/servers/:serverId/:channelId` | Belirli kanal sohbeti |
| `/live` | Canlı yayın keşfi |
| `/live/:streamId` | Canlı yayın izleme |
| `/notifications` | Bildirim listesi |
| `/settings` | Ayarlar sayfası |
| `/profile` | Kullanıcı profili |

---

## Özellik Modülleri

### 1. Feed Modülü

**Dosyalar:**
- `src/features/feed/FeedPage.tsx` - Ana sayfa
- `src/features/feed/feedApi.ts` - API fonksiyonları
- `src/features/feed/useInfiniteFeed.ts` - Infinite scroll hook
- `src/features/feed/components/` - UI bileşenleri

**Özellikler:**
- Cursor-based pagination ile sonsuz scroll
- Post oluşturma (text, visibility seçimi)
- Like, Repost, Bookmark toggle işlemleri (optimistic)
- Filtreleme: all / friends / servers
- Sunucu/kullanıcı araması

**API Endpoints:**
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/feed` | Timeline fetch (cursor pagination) |
| POST | `/api/v1/posts` | Yeni post oluştur |
| POST | `/api/v1/posts/:id/like` | Like toggle |
| POST | `/api/v1/posts/:id/repost` | Repost toggle |
| POST | `/api/v1/posts/:id/bookmark` | Bookmark toggle |
| GET | `/api/v1/search/entities` | Server/User arama |

---

### 2. DM (Direct Message) Modülü

**Dosyalar:**
- `src/features/dm/DmPage.tsx` - DM ana sayfası
- `src/features/dm/dmApi.ts` - API fonksiyonları
- `src/features/dm/useInfiniteConversations.ts` - Konuşma listesi hook
- `src/features/dm/useInfiniteMessages.ts` - Mesaj listesi hook

**Özellikler:**
- Konuşma listesi (son mesaj preview, okunmamış sayısı)
- Mesaj geçmişi (infinite scroll - older direction)
- Optimistic mesaj gönderme (clientId ile idempotency)
- Okundu bilgisi (read receipts)
- Konuşma arama

**API Endpoints:**
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/dm/conversations` | Konuşma listesi |
| GET | `/api/v1/dm/conversations/:id/messages` | Mesaj geçmişi |
| POST | `/api/v1/dm/conversations/:id/messages` | Mesaj gönder |
| POST | `/api/v1/dm/messages/:id/read` | Okundu işaretle |
| GET | `/api/v1/search/dm` | DM içi arama |

**Kritik İş Mantığı:**
- `clientId` zorunlu (frontend UUID üretir, backend idempotency sağlar)
- Mesaj gönderildiğinde optimistic UI güncellenir
- Backend response gelince `clientId` ile eşleştirip gerçek `id` atanır

---

### 3. Servers Modülü

**Dosyalar:**
- `src/features/servers/ServersPage.tsx` - Ana sayfa
- `src/features/servers/serversApi.ts` - API fonksiyonları
- `src/features/servers/hooks/` - 7 adet özelleşmiş hook
- `src/features/servers/components/` - 12 adet UI bileşeni

**Özellikler:**

#### Sunucu Yönetimi
- Sunucu listesi (secondary sidebar)
- Sunucu oluşturma (modal)
- Sunucu profili görüntüleme
- Sunucu ayarları (TODO)

#### Kanal Sistemi
- Metin kanalları (text)
- Ses kanalları (voice)
- Kategorize edilmiş kanal listesi (INFORMATION, TEXT CHANNELS, VOICE ROOMS)
- Sohbet mesajlaşma (infinite scroll)

#### Üye Yönetimi
- Üye listesi (rol bazlı gruplandırma)
- Presence durumu (online, idle, dnd, offline)
- Bot/moderator/admin badges

**API Endpoints:**
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/servers` | Sunucu listesi |
| POST | `/api/v1/servers` | Yeni sunucu oluştur |
| GET | `/api/v1/servers/:id` | Sunucu detayı |
| GET | `/api/v1/servers/:id/profile` | Sunucu profili |
| GET | `/api/v1/servers/:id/channels` | Kanal listesi |
| GET | `/api/v1/servers/:id/members` | Üye listesi |
| GET | `/api/v1/servers/:id/feed` | Sunucu feed'i |
| GET | `/api/v1/servers/:id/channels/:chId/messages` | Kanal mesajları |
| POST | `/api/v1/servers/:id/channels/:chId/messages` | Mesaj gönder |

---

### 4. Live (Canlı Yayın) Modülü

**Dosyalar:**
- `src/features/live/LivePage.tsx` - Ana sayfa (36KB - en büyük component)
- `src/features/live/liveApi.ts` - API fonksiyonları
- `src/features/live/useInfiniteLiveStreams.ts` - Stream listesi hook
- `src/features/live/useLiveChat.ts` - Live chat hook

**Özellikler:**

#### Yayın Keşfi
- Kategori filtrelemesi
- Sıralama: recommended, viewers_desc, recent
- Yayıncı arama
- Thumbnail ve viewer count

#### Yayın İzleme
- Video oynatıcı (TODO: gerçek implementasyon)
- Live chat (infinite scroll)
- Yayıncı bilgileri

#### Yayın Yapma (Go Live)
- Başlık ve kategori seçimi
- Tag ekleme
- Latency modu (normal/low)
- RTMP ingest bilgileri

**API Endpoints:**
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/live/categories` | Kategori listesi |
| GET | `/api/v1/live/streams` | Yayın listesi |
| GET | `/api/v1/live/streams/:id` | Yayın detayı |
| POST | `/api/v1/live/streams` | Yayın başlat |
| POST | `/api/v1/live/streams/:id/stop` | Yayın durdur |
| GET | `/api/v1/live/streams/:id/chat` | Chat mesajları |
| POST | `/api/v1/live/streams/:id/chat` | Chat mesajı gönder |

---

### 5. Notifications Modülü

**Dosyalar:**
- `src/features/notifications/NotificationsPage.tsx`

**Özellikler (Planlanıyor):**
- Bildirim listesi (like, repost, mention, follow, system)
- Okundu/okunmadı durumu
- Tümünü okundu işaretle
- Sidebar'da badge gösterimi

**Planlanacak API Endpoints:**
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/notifications` | Bildirim listesi |
| POST | `/api/v1/notifications/:id/read` | Okundu işaretle |
| POST | `/api/v1/notifications/read-all` | Tümünü okundu işaretle |

---

### 6. Settings Modülü

**Dosyalar:**
- `src/features/settings/SettingsPage.tsx`

**Özellikler:**
- Tema tercihleri (local storage persist)
- Bildirim ayarları
- Gizlilik ayarları
- Hesap ayarları (TODO)

---

### 7. Profile Modülü

**Dosyalar:**
- `src/features/profile/ProfilePage.tsx`

**Özellikler (Planlanıyor):**
- Kullanıcı profil görüntüleme
- Profil düzenleme
- Takipçi/takip edilen listeleri
- Kullanıcının postları

---

## Veri Modelleri

### Core Types

```typescript
type ID = string;
type ISODateTime = string; // "2025-01-01T00:00:00.000Z"

type User = {
  id: ID;
  handle: string;              // @username
  displayName: string;
  avatarGradient: [string, string]; // CSS gradient colors
};

type Server = {
  id: ID;
  name: string;
  accent: string;              // Brand color (hex)
};

type ServerChannel = {
  id: ID;
  serverId: ID;
  name: string;
  kind: "text" | "voice";
  position: number;
};

type ServerMember = User & {
  role: "admin" | "moderator" | "member" | "bot";
  presence: "online" | "idle" | "dnd" | "offline";
};
```

### Post Types

```typescript
type Visibility = "friends" | "servers" | "public";

type Post = {
  id: ID;
  author: User;
  server?: Server;             // Sunucu postu ise
  createdAt: ISODateTime;
  content: { text: string };
  visibility: Visibility;
  stats: {
    replyCount: number;
    repostCount: number;
    likeCount: number;
    bookmarkCount: number;
  };
  viewer: {
    liked: boolean;
    reposted: boolean;
    bookmarked: boolean;
  };
  attachments?: PostAttachment[];
};
```

### Message Types

```typescript
type Message = {
  id: ID;
  conversationId: ID;
  sender: User;
  createdAt: ISODateTime;
  text: string;
  status: "sent" | "delivered" | "read";
  clientId?: string;           // Idempotency için
};

type ServerChannelMessage = {
  id: ID;
  serverId: ID;
  channelId: ID;
  sender: User;
  createdAt: ISODateTime;
  text: string;
  clientId?: string;
};
```

### Pagination

```typescript
type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;   // null = son sayfa
};
```

---

## API Endpoint Sözleşmesi

### Genel Kurallar

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Pagination**: Cursor-based (forward feed, backward messages)
- **Error Format**:
  ```json
  {
    "code": "VALIDATION_ERROR",
    "message": "Post metni boş olamaz.",
    "details": {}
  }
  ```

### Authentication (Planlanıyor)

Frontend şu an `GET /api/v1/me` ile kullanıcı bilgisi alıyor. Backend'de:

```
Authorization: Bearer <JWT>
```

header'ı ile auth yapılmalı. Session-based alternatif de düşünülebilir.

---

## Placeholder Fonksiyonlar ve Gerçek İş Mantıkları

### 1. Server Dropdown Menu Actions

**Dosya:** `src/features/servers/ServersPage.tsx`

| Placeholder | Gerçek İş Mantığı |
|-------------|-------------------|
| `onServerOverview` | Server profil sayfasına navigasyon (✅ implement edildi) |
| `onInvitePeople` | Davet linki oluşturma modali. Backend: `POST /api/v1/servers/:id/invites` |
| `onServerSettings` | Server ayarları overlay. Backend: `PATCH /api/v1/servers/:id` |
| `onCreateChannel` | Kanal oluşturma modali. Backend: `POST /api/v1/servers/:id/channels` |

### 2. Voice Session

**Dosya:** `src/features/servers/hooks/useVoiceSession.ts`

```typescript
// Şu anki mock implementasyon:
const [voiceSession, setVoiceSession] = useState<VoiceSession | null>(null);

const joinVoice = (channelId: ID) => {
  setVoiceSession({ channelId, muted: false, deafened: false, cameraOn: false });
};
```

**Gerçek İş Mantığı:**
1. WebRTC peer connection kurulumu
2. SFU (Selective Forwarding Unit) sunucusuna bağlantı
3. Audio/video stream yönetimi
4. Signaling: `WebSocket /api/v1/voice/signal`

### 3. Read Receipts

**Dosya:** `src/features/dm/dmApi.ts`

```typescript
markRead(messageId: string): Promise<MarkReadResponse>
```

**Gerçek İş Mantığı:**
- `messageId` ve önceki tüm mesajları okundu işaretle
- Conversation'ın `unreadCount`'unu güncelle
- Real-time: karşı tarafa "read" event'i gönder (WebSocket)

### 4. Live Streaming

**Dosya:** `src/features/live/liveApi.ts`

```typescript
startLiveStream(payload): Promise<StartLiveStreamResponse>
```

**Gerçek İş Mantığı:**
1. Stream kaydı oluştur (database)
2. RTMP ingest endpoint al (media server integration)
3. Stream key generate et
4. CDN edge URL'leri döndür

**Gerekli Entegrasyonlar:**
- RTMP media server (ör. nginx-rtmp, OBS ingest)
- HLS/DASH transcoding pipeline
- CDN dağıtımı

### 5. Post Attachments

**Dosya:** `src/api/types.ts`

```typescript
type PostAttachment =
  | { kind: "image"; url: string; width: number; height: number; }
  | { kind: "link"; url: string; title: string; };
```

**Gerçek İş Mantığı:**
1. Image upload: `POST /api/v1/media/upload` (multipart/form-data)
2. Link preview: URL metadata fetch (og:title, og:image, vb.)
3. Blur data URL generation (placeholder için)

---

## Real-time Gereksinimler

### WebSocket Endpoints (Önerilen)

```
ws://api.xcord.dev/api/v1/ws
```

### Event Types

| Event | Payload | Kullanım |
|-------|---------|----------|
| `dm.message.new` | `{ message: Message }` | Yeni DM mesajı |
| `dm.message.read` | `{ conversationId, readAt }` | Okundu bilgisi |
| `server.message.new` | `{ message: ServerChannelMessage }` | Kanal mesajı |
| `server.member.presence` | `{ userId, presence }` | Presence update |
| `notification.new` | `{ notification: Notification }` | Yeni bildirim |
| `live.chat.message` | `{ message: LiveChatMessage }` | Live chat |
| `live.viewer.count` | `{ streamId, count }` | Viewer update |

### Subscription Model

```json
// Client -> Server
{ "type": "subscribe", "channels": ["dm.user_123", "server.srv_456"] }

// Server -> Client
{ "type": "event", "event": "dm.message.new", "payload": {...} }
```

---

## Öneriler

### 1. Database Schema Tasarımı

```sql
-- Core entities
users (id, handle, display_name, avatar_gradient, created_at)
servers (id, name, accent, owner_id, created_at)
server_members (server_id, user_id, role, joined_at)
server_channels (id, server_id, name, kind, position)

-- Content
posts (id, author_id, server_id, text, visibility, created_at)
post_interactions (post_id, user_id, type) -- like/repost/bookmark

-- Messaging
conversations (id, kind, created_at, updated_at)
conversation_participants (conversation_id, user_id)
messages (id, conversation_id, sender_id, text, status, client_id, created_at)
server_channel_messages (id, channel_id, sender_id, text, client_id, created_at)

-- Live
live_streams (id, broadcaster_id, title, category_id, started_at, ended_at)
live_categories (id, name, tags)
live_chat_messages (id, stream_id, user_id, text, kind, created_at)
```

### 2. Caching Stratejisi

- **User sessions**: Redis (TTL 24h)
- **Server members/channels**: Redis cache (invalidate on change)
- **Feed**: Denormalized Redis list (fanout-on-write veya fanout-on-read)
- **Live viewer counts**: Redis INCR/DECR

### 3. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| POST endpoints | 30/min per user |
| GET feed/messages | 120/min per user |
| Live chat | 60/min per user |
| Search | 30/min per user |

### 4. Idempotency

DM ve Server mesajlarında `clientId` (UUID v7 önerilir) frontend tarafından üretilir:

```go
// Backend pseudocode
func CreateMessage(req CreateMessageRequest) {
    existing := db.FindByClientId(req.ClientId)
    if existing != nil {
        return existing // Idempotent response
    }
    // Create new message...
}
```

### 5. Pagination Consistency

- **Feed (forward)**: `cursor` = last item's timestamp or ID
- **Messages (backward/older)**: `cursor` = first item's timestamp or ID
- Her zaman `nextCursor: null` ile "no more data" sinyali ver

---

## Sonraki Adımlar

1. **Auth sistemi**: JWT veya session-based authentication
2. **WebSocket gateway**: Real-time events için
3. **Media service**: Image upload, video transcoding
4. **Notification service**: Push notifications (Tauri native)
5. **Search service**: Elasticsearch veya PostgreSQL full-text search

---

*Bu doküman, frontend implementasyonuna dayanarak oluşturulmuştur. Backend geliştirmesi sırasında güncellenmeli ve API versioning stratejisi belirlenmelidir.*
