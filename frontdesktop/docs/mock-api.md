# XCORD Mock API (v1)

Bu doküman, prototip sırasında kullanılan mock endpoint sözleşmesini tanımlar. Amaç:

- Frontend geliştirme sırasında gerçek backend olmadan ilerlemek
- Daha sonra Go backend geliştirirken birebir aynı sözleşmeyle ilerlemek
- Entegrasyonu hızlı ve risksiz yapmak (tipler + stabil URL'ler)

## Genel

- Base path: `/api/v1`
- Content-Type: `application/json`
- Hata formatı:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Post metni boş olamaz.",
  "details": {}
}
```

## Mod Seçimi

Frontend tarafında API modu env ile seçilir:

- `VITE_API_MODE=mock` (varsayılan)
- `VITE_API_MODE=real`

Mock modunda, istekler `src/api/mock/mockFetch.ts` üzerinden cevaplanır.

---

## Core Endpoints

### GET `/me`

Aktif kullanıcı bilgisini döndürür.

Response:

```json
{
  "user": {
    "id": "user_0",
    "handle": "tp",
    "displayName": "TP",
    "avatarGradient": ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)"]
  }
}
```

### GET `/servers`

Takip edilen/erişilebilir server listesini döndürür.

Response:

```json
{
  "servers": [
    { "id": "srv_1", "name": "XCORD Dev", "accent": "#94465b" }
  ]
}
```

### POST `/servers`

Yeni sunucu oluşturur.

Request:

```json
{
  "name": "My Server"
}
```

Response (201):

```json
{
  "server": { "id": "srv_new", "name": "My Server", "accent": "#8b5cf6" }
}
```

### GET `/friends`

Takip edilen arkadaş listesini döndürür.

Response:

```json
{
  "users": [
    { "id": "user_1", "handle": "velvetvoid", "displayName": "Velvet Void", "avatarGradient": ["#bd6a72", "#94465b"] }
  ]
}
```

---

## Feed Endpoints

### GET `/feed`

Twitter-benzeri akış döndürür. Cursor tabanlı pagination kullanır.

Query:

- `cursor`: string | null
- `limit`: number (5..50, default 20)
- `filter`: `all | friends | servers` (default `all`)

Response:

```json
{
  "items": [/* Post[] */],
  "nextCursor": "20"
}
```

### POST `/posts`

Yeni post oluşturur.

Request:

```json
{
  "text": "hello",
  "visibility": "friends",
  "serverId": "srv_1"
}
```

Kurallar:

- `text` boş olamaz, max 2800 karakter
- `visibility`: `friends | servers | public`

Response (201):

```json
{
  "post": {/* Post */}
}
```

### GET `/posts/:id`

Tek post döndürür.

Response:

```json
{
  "post": {/* Post */}
}
```

### POST `/posts/:id/like`

Like toggle eder.

Response:

```json
{
  "active": true,
  "counts": { "likeCount": 12, "repostCount": 2, "bookmarkCount": 1 },
  "viewer": { "liked": true, "reposted": false, "bookmarked": false }
}
```

### POST `/posts/:id/repost`

Repost toggle eder.

Response: `POST /posts/:id/like` ile aynı format.

### POST `/posts/:id/bookmark`

Bookmark toggle eder.

Response: `POST /posts/:id/like` ile aynı format.

---

## DM Endpoints

DM endpointleri, cursor tabanlı pagination ve idempotent mesaj gönderimi için `clientId` kullanır.

### GET `/dm/conversations`

Sohbet listesini döndürür.

Query:

- `cursor`: string | null
- `limit`: number (10..50, default 20)
- `query`: string (opsiyonel, displayName/handle araması)

Response:

```json
{
  "items": [/* Conversation[] */],
  "nextCursor": "20"
}
```

### GET `/dm/conversations/:id/messages`

Mesaj geçmişini döndürür. `cursor`, "endIndex" mantığıyla daha eski mesajlara gider.

Query:

- `cursor`: string | null
- `limit`: number (10..80, default 30)

Response:

```json
{
  "items": [/* Message[] */],
  "nextCursor": "12"
}
```

### POST `/dm/conversations/:id/messages`

Mesaj gönderir. `clientId` zorunludur (frontend optimistic send ve backend idempotency için).

Request:

```json
{
  "text": "selam",
  "clientId": "c_01J..."
}
```

Response (201):

```json
{
  "message": {/* Message */}
}
```

### POST `/dm/messages/:id/read`

Mesajı ve önceki mesajları okundu olarak işaretler; sohbetin `unreadCount` değerini günceller.

Response:

```json
{
  "conversationId": "dm_1",
  "unreadCount": 0
}
```

---

## Server Endpoints

### GET `/servers/:id`

Sunucu detayını döndürür.

Response:

```json
{
  "server": { "id": "srv_1", "name": "XCORD Dev", "accent": "#94465b" }
}
```

### GET `/servers/:id/profile`

Sunucu profil bilgilerini döndürür.

Response:

```json
{
  "profile": {
    "serverId": "srv_1",
    "about": "XCORD development community",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "memberCount": 1250,
    "onlineCount": 142,
    "tags": ["development", "community"]
  }
}
```

### GET `/servers/:id/channels`

Sunucunun kanallarını döndürür.

Response:

```json
{
  "serverId": "srv_1",
  "channels": [
    { "id": "ch_1", "serverId": "srv_1", "name": "welcome", "kind": "text", "position": 0 },
    { "id": "ch_2", "serverId": "srv_1", "name": "general", "kind": "text", "position": 1 },
    { "id": "ch_v1", "serverId": "srv_1", "name": "Lounge", "kind": "voice", "position": 10 }
  ]
}
```

### GET `/servers/:id/members`

Sunucu üyelerini döndürür.

Response:

```json
{
  "members": [
    {
      "id": "user_1",
      "handle": "admin",
      "displayName": "Server Admin",
      "avatarGradient": ["#ff6b6b", "#4ecdc4"],
      "role": "admin",
      "presence": "online"
    }
  ]
}
```

### GET `/servers/:id/feed`

Sunucunun feed'ini döndürür. Cursor tabanlı pagination.

Query:

- `cursor`: string | null
- `limit`: number (5..50, default 20)

Response:

```json
{
  "items": [/* Post[] */],
  "nextCursor": "20"
}
```

### GET `/servers/:id/channels/:channelId/messages`

Kanal mesajlarını döndürür. `cursor`, "endIndex" mantığıyla daha eski mesajlara gider.

Query:

- `cursor`: string | null
- `limit`: number (10..100, default 40)

Response:

```json
{
  "items": [/* ServerChannelMessage[] */],
  "nextCursor": "12"
}
```

### POST `/servers/:id/channels/:channelId/messages`

Kanal mesajı gönderir. `clientId` zorunludur.

Request:

```json
{
  "text": "merhaba kanal",
  "clientId": "c_01J..."
}
```

Response (201):

```json
{
  "message": {/* ServerChannelMessage */}
}
```

---

## Live Endpoints

Canlı yayın MVP sözleşmesi. Video oynatma mock modunda yoktur; amaç UI + akış + chat + ingest bilgilerini uçtan uca test etmektir.

### GET `/live/categories`

Canlı yayın kategorilerini döndürür.

Response:

```json
{
  "categories": [
    { "id": "cat_1", "name": "Just Chatting", "tags": ["chat", "irl"] }
  ]
}
```

### GET `/live/streams`

Canlı yayın listesini döndürür. Cursor tabanlı pagination kullanır.

Query:

- `cursor`: string | null
- `limit`: number (6..60, default 24)
- `query`: string (opsiyonel; title + broadcaster displayName/handle araması)
- `categoryId`: string | null (opsiyonel; kategori filtresi)
- `sort`: `recommended | viewers_desc | recent` (default `recommended`)

Response:

```json
{
  "items": [/* LiveStream[] */],
  "nextCursor": "24"
}
```

### GET `/live/streams/:id`

Tek stream döndürür.

Response:

```json
{
  "stream": {/* LiveStream */}
}
```

### POST `/live/streams`

Yayın başlatır (Go Live). Mock modunda stream kaydı oluşturur ve ingest bilgisi döndürür.

Request:

```json
{
  "title": "Just chatting",
  "categoryId": "cat_1",
  "tags": ["dev", "community"],
  "language": "tr",
  "mature": false,
  "latencyMode": "low"
}
```

Kurallar:

- `title`: 3..120 karakter
- `tags`: en fazla 6 etiket
- `language`: 2..8 karakter (örn. `tr`, `en`)
- `latencyMode`: `normal | low`

Response (201):

```json
{
  "stream": {/* LiveStream */},
  "ingest": {
    "rtmpUrl": "rtmp://ingest.xcord.local/live",
    "streamKeyMasked": "sk_1a2b••••••••••",
    "region": "eu-west",
    "recommended": {
      "fps": 60,
      "resolution": "1920x1080",
      "videoBitrateKbps": 6000,
      "audioBitrateKbps": 160,
      "keyframeIntervalSec": 2
    }
  }
}
```

### POST `/live/streams/:id/stop`

Yayını durdurur.

Response:

```json
{
  "streamId": "live_1",
  "endedAt": "2025-01-01T00:00:00.000Z"
}
```

### GET `/live/streams/:id/chat`

Stream chat mesajlarını döndürür. `cursor`, "endIndex" mantığıyla daha eski mesajlara gider.

Query:

- `cursor`: string | null
- `limit`: number (10..120, default 40)

Response:

```json
{
  "items": [/* LiveChatMessage[] */],
  "nextCursor": "12"
}
```

### POST `/live/streams/:id/chat`

Chat mesajı gönderir.

Request:

```json
{
  "text": "selam chat"
}
```

Response (201):

```json
{
  "message": {/* LiveChatMessage */}
}
```

---

## Search Endpoints

### GET `/search/entities`

Sunucu ve kullanıcı araması yapar.

Query:

- `q`: string (arama terimi)

Response:

```json
{
  "servers": [/* Server[] */],
  "users": [/* User[] */]
}
```

### GET `/search/dm`

DM içinde arama yapar.

Query:

- `q`: string (arama terimi)

Response:

```json
{
  "users": [/* User[] */],
  "messages": [/* DmSearchHit[] */]
}
```

---

## Tipler

Tip tanımları: `src/api/types.ts`

Bkz: [Platform Spec](./platform-spec.md) - detaylı veri modelleri için.
