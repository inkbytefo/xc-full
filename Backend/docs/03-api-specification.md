# XCORD Backend - API Specification

> Versiyon: 1.0 | Tarih: 2025-12-21 | OpenAPI 3.0

---

## 📋 İçindekiler

1. [API Genel Kurallar](#api-genel-kurallar)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Feed Endpoints](#feed-endpoints)
5. [DM Endpoints](#dm-endpoints)
6. [Server Endpoints](#server-endpoints)
7. [Live Endpoints](#live-endpoints)
8. [Notification Endpoints](#notification-endpoints)
9. [Error Handling](#error-handling)

---

## API Genel Kurallar

### Base URL

```
Production:  https://api.xcord.dev/api/v1
Development: http://localhost:8080/api/v1
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Conditional | `Bearer <JWT>` (protected endpoints) |
| `X-Request-ID` | Optional | Tracing ID (UUID) |
| `X-Client-ID` | Optional | Idempotency key |

### Response Format

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "nextCursor": "string | null",
    "totalCount": 100
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {
      "field": "error description"
    }
  }
}
```

### Pagination

Cursor-based pagination kullanılır:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cursor` | string | null | Pagination cursor |
| `limit` | int | 20 | Items per page (max: 100) |

**Response:**
```json
{
  "data": {
    "items": [...],
    "nextCursor": "eyJpZCI6IjEyMyJ9"
  }
}
```

### Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Read operations | 120 | 1 minute |
| Write operations | 30 | 1 minute |
| Search | 30 | 1 minute |
| Live chat | 60 | 1 minute |

Response headers:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 1640000000
```

---

## Authentication

### POST `/auth/register`

Yeni kullanıcı kaydı.

**Request:**
```json
{
  "handle": "username",
  "displayName": "Display Name",
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validation:**
- `handle`: 3-20 karakter, [a-z0-9_]
- `displayName`: 1-50 karakter
- `email`: Valid email format
- `password`: Min 8 karakter, 1 uppercase, 1 number

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "user_abc123",
      "handle": "username",
      "displayName": "Display Name",
      "avatarGradient": ["#ff6b6b", "#4ecdc4"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

---

### POST `/auth/login`

Kullanıcı girişi.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

---

### POST `/auth/refresh`

Token yenileme.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900
  }
}
```

---

### POST `/auth/logout`

🔒 **Requires Auth**

Logout ve refresh token invalidation.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (204):** No content

---

## Core Endpoints

### GET `/me`

🔒 **Requires Auth**

Aktif kullanıcı bilgisi.

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "user_abc123",
      "handle": "username",
      "displayName": "Display Name",
      "email": "user@example.com",
      "avatarGradient": ["#ff6b6b", "#4ecdc4"],
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

### PATCH `/me`

🔒 **Requires Auth**

Profil güncelleme.

**Request:**
```json
{
  "displayName": "New Display Name",
  "avatarGradient": ["#new1", "#new2"]
}
```

**Response (200):**
```json
{
  "data": {
    "user": { ... }
  }
}
```

---

### GET `/friends`

🔒 **Requires Auth**

Arkadaş listesi.

**Response (200):**
```json
{
  "data": {
    "users": [
      {
        "id": "user_def456",
        "handle": "friend1",
        "displayName": "Friend One",
        "avatarGradient": ["#bd6a72", "#94465b"]
      }
    ]
  }
}
```

---

## Feed Endpoints

### GET `/feed`

🔒 **Requires Auth**

Timeline feed.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | null | Pagination cursor |
| `limit` | int | 20 | 5-50 |
| `filter` | string | "all" | all, friends, servers |

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "post_xyz789",
        "author": {
          "id": "user_abc123",
          "handle": "username",
          "displayName": "Display Name",
          "avatarGradient": ["#ff6b6b", "#4ecdc4"]
        },
        "server": {
          "id": "srv_1",
          "name": "XCORD Dev",
          "accent": "#94465b"
        },
        "content": {
          "text": "Hello world!"
        },
        "visibility": "public",
        "stats": {
          "replyCount": 5,
          "repostCount": 2,
          "likeCount": 42,
          "bookmarkCount": 3
        },
        "viewer": {
          "liked": false,
          "reposted": false,
          "bookmarked": true
        },
        "attachments": [],
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "nextCursor": "eyJpZCI6InBvc3RfeHl6Nzg5In0"
  }
}
```

---

### POST `/posts`

🔒 **Requires Auth**

Yeni post oluştur.

**Request:**
```json
{
  "text": "Hello world!",
  "visibility": "public",
  "serverId": "srv_1"
}
```

**Validation:**
- `text`: 1-2800 karakter
- `visibility`: friends | servers | public
- `serverId`: Optional, require if visibility is "servers"

**Response (201):**
```json
{
  "data": {
    "post": { ... }
  }
}
```

---

### GET `/posts/:id`

Tek post getir.

**Response (200):**
```json
{
  "data": {
    "post": { ... }
  }
}
```

---

### POST `/posts/:id/like`

🔒 **Requires Auth**

Like toggle.

**Response (200):**
```json
{
  "data": {
    "active": true,
    "stats": {
      "likeCount": 43,
      "repostCount": 2,
      "bookmarkCount": 3
    },
    "viewer": {
      "liked": true,
      "reposted": false,
      "bookmarked": true
    }
  }
}
```

---

### POST `/posts/:id/repost`

🔒 **Requires Auth**

Repost toggle.

**Response (200):** Same as `/posts/:id/like`

---

### POST `/posts/:id/bookmark`

🔒 **Requires Auth**

Bookmark toggle.

**Response (200):** Same as `/posts/:id/like`

---

## DM Endpoints

### GET `/dm/conversations`

🔒 **Requires Auth**

Konuşma listesi.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| `cursor` | string | null |
| `limit` | int | 20 |
| `query` | string | null |

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "dm_conv_1",
        "participants": [
          {
            "id": "user_def456",
            "handle": "friend1",
            "displayName": "Friend One",
            "avatarGradient": ["#bd6a72", "#94465b"]
          }
        ],
        "lastMessage": {
          "id": "msg_123",
          "text": "Hey, are you there?",
          "createdAt": "2025-01-01T15:30:00.000Z"
        },
        "unreadCount": 2,
        "updatedAt": "2025-01-01T15:30:00.000Z"
      }
    ],
    "nextCursor": "eyJpZCI6ImRtX2NvbnZfMSJ9"
  }
}
```

---

### GET `/dm/conversations/:id/messages`

🔒 **Requires Auth**

Mesaj geçmişi.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | string | null | For older messages |
| `limit` | int | 30 | 10-80 |

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "msg_456",
        "conversationId": "dm_conv_1",
        "sender": { ... },
        "text": "Hello!",
        "status": "read",
        "clientId": "c_01HXYZ...",
        "createdAt": "2025-01-01T15:00:00.000Z"
      }
    ],
    "nextCursor": "eyJpZCI6Im1zZ180NTYifQ"
  }
}
```

---

### POST `/dm/conversations/:id/messages`

🔒 **Requires Auth**

Mesaj gönder.

**Request:**
```json
{
  "text": "Hello!",
  "clientId": "c_01HXYZ..."
}
```

**Validation:**
- `text`: 1-4000 karakter
- `clientId`: Required, UUID v7 format

**Response (201):**
```json
{
  "data": {
    "message": {
      "id": "msg_789",
      "conversationId": "dm_conv_1",
      "sender": { ... },
      "text": "Hello!",
      "status": "sent",
      "clientId": "c_01HXYZ...",
      "createdAt": "2025-01-01T15:35:00.000Z"
    }
  }
}
```

---

### POST `/dm/messages/:id/read`

🔒 **Requires Auth**

Mesajı okundu işaretle.

**Response (200):**
```json
{
  "data": {
    "conversationId": "dm_conv_1",
    "unreadCount": 0
  }
}
```

---

## Server Endpoints

### GET `/servers`

🔒 **Requires Auth**

Kullanıcının sunucu listesi.

**Response (200):**
```json
{
  "data": {
    "servers": [
      {
        "id": "srv_1",
        "name": "XCORD Dev",
        "accent": "#94465b"
      }
    ]
  }
}
```

---

### POST `/servers`

🔒 **Requires Auth**

Yeni sunucu oluştur.

**Request:**
```json
{
  "name": "My Server"
}
```

**Validation:**
- `name`: 2-100 karakter

**Response (201):**
```json
{
  "data": {
    "server": {
      "id": "srv_new",
      "name": "My Server",
      "accent": "#8b5cf6"
    }
  }
}
```

---

### GET `/servers/:id`

Sunucu detayı.

**Response (200):**
```json
{
  "data": {
    "server": { ... }
  }
}
```

---

### GET `/servers/:id/profile`

Sunucu profili.

**Response (200):**
```json
{
  "data": {
    "profile": {
      "serverId": "srv_1",
      "about": "XCORD development community",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "memberCount": 1250,
      "onlineCount": 142,
      "tags": ["development", "community"]
    }
  }
}
```

---

### GET `/servers/:id/channels`

Sunucu kanalları.

**Response (200):**
```json
{
  "data": {
    "serverId": "srv_1",
    "channels": [
      {
        "id": "ch_1",
        "serverId": "srv_1",
        "name": "welcome",
        "kind": "text",
        "position": 0
      },
      {
        "id": "ch_v1",
        "serverId": "srv_1",
        "name": "Lounge",
        "kind": "voice",
        "position": 10
      }
    ]
  }
}
```

---

### POST `/servers/:id/channels`

🔒 **Requires Auth** (Admin/Mod)

Kanal oluştur.

**Request:**
```json
{
  "name": "new-channel",
  "kind": "text"
}
```

**Response (201):**
```json
{
  "data": {
    "channel": { ... }
  }
}
```

---

### GET `/servers/:id/members`

Sunucu üyeleri.

**Response (200):**
```json
{
  "data": {
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
}
```

---

### GET `/servers/:id/channels/:channelId/messages`

🔒 **Requires Auth**

Kanal mesajları.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| `cursor` | string | null |
| `limit` | int | 40 |

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "ch_msg_1",
        "serverId": "srv_1",
        "channelId": "ch_1",
        "sender": { ... },
        "text": "Hello channel!",
        "clientId": "c_01HXY...",
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "nextCursor": "..."
  }
}
```

---

### POST `/servers/:id/channels/:channelId/messages`

🔒 **Requires Auth**

Kanal mesajı gönder.

**Request:**
```json
{
  "text": "Hello channel!",
  "clientId": "c_01HXY..."
}
```

**Response (201):**
```json
{
  "data": {
    "message": { ... }
  }
}
```

---

## Live Endpoints

### GET `/live/categories`

Canlı yayın kategorileri.

**Response (200):**
```json
{
  "data": {
    "categories": [
      {
        "id": "cat_1",
        "name": "Just Chatting",
        "tags": ["chat", "irl"]
      }
    ]
  }
}
```

---

### GET `/live/streams`

Canlı yayın listesi.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| `cursor` | string | null |
| `limit` | int | 24 |
| `query` | string | null |
| `categoryId` | string | null |
| `sort` | string | "recommended" |

**sort values:** recommended, viewers_desc, recent

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "live_1",
        "broadcaster": { ... },
        "title": "Just chatting!",
        "category": { ... },
        "viewerCount": 1250,
        "thumbnailUrl": "https://...",
        "startedAt": "2025-01-01T10:00:00.000Z"
      }
    ],
    "nextCursor": "..."
  }
}
```

---

### POST `/live/streams`

🔒 **Requires Auth**

Yayın başlat.

**Request:**
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

**Response (201):**
```json
{
  "data": {
    "stream": { ... },
    "ingest": {
      "rtmpUrl": "rtmp://ingest.xcord.dev/live",
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
}
```

---

### POST `/live/streams/:id/stop`

🔒 **Requires Auth**

Yayın durdur.

**Response (200):**
```json
{
  "data": {
    "streamId": "live_1",
    "endedAt": "2025-01-01T14:00:00.000Z"
  }
}
```

---

## Notification Endpoints

### GET `/notifications`

🔒 **Requires Auth**

Bildirim listesi.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| `cursor` | string | null |
| `limit` | int | 20 |
| `unreadOnly` | boolean | false |

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "notif_1",
        "type": "like",
        "actor": { ... },
        "target": {
          "type": "post",
          "id": "post_xyz"
        },
        "read": false,
        "createdAt": "2025-01-01T12:00:00.000Z"
      }
    ],
    "nextCursor": "...",
    "unreadCount": 5
  }
}
```

**Notification Types:**
- `like` - Post beğenisi
- `repost` - Repost
- `mention` - Bahsetme
- `follow` - Yeni takipçi
- `dm` - Yeni DM
- `server_invite` - Sunucu daveti
- `system` - Sistem bildirimi

---

### POST `/notifications/:id/read`

🔒 **Requires Auth**

Bildirimi okundu işaretle.

**Response (200):**
```json
{
  "data": {
    "unreadCount": 4
  }
}
```

---

### POST `/notifications/read-all`

🔒 **Requires Auth**

Tüm bildirimleri okundu işaretle.

**Response (200):**
```json
{
  "data": {
    "unreadCount": 0
  }
}
```

---

## Search Endpoints

### GET `/search/entities`

Sunucu ve kullanıcı araması.

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| `q` | string | Yes |

**Response (200):**
```json
{
  "data": {
    "servers": [...],
    "users": [...]
  }
}
```

---

### GET `/search/dm`

DM içi arama.

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| `q` | string | Yes |

**Response (200):**
```json
{
  "data": {
    "users": [...],
    "messages": [
      {
        "messageId": "msg_123",
        "conversationId": "dm_conv_1",
        "snippet": "...matched text...",
        "createdAt": "..."
      }
    ]
  }
}
```

---

## Error Handling

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | JWT expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Error Response Examples

```json
// Validation Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "invalid email format",
      "password": "must be at least 8 characters"
    }
  }
}

// Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}

// Rate Limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

*Sonraki: [Database Design](./04-database-design.md)*
