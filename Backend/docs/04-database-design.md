# XCORD Backend - Database Design

> Versiyon: 1.0 | Tarih: 2025-12-21 | PostgreSQL 16+

---

## 📋 İçindekiler

1. [Database Selection](#database-selection)
2. [Schema Overview](#schema-overview)
3. [Table Definitions](#table-definitions)
4. [Indexes](#indexes)
5. [Relationships](#relationships)
6. [Migrations](#migrations)

---

## Database Selection

### Primary Database: PostgreSQL 16+

| Özellik | PostgreSQL | Gerekçe |
|---------|------------|---------|
| ACID Transactions | ✅ | Data integrity |
| Complex Queries | ✅ | JOINs, CTEs, Window functions |
| JSONB | ✅ | Flexible data (settings, metadata) |
| Full-text Search | ✅ | Built-in tsvector |
| Partitioning | ✅ | Time-series data (messages, posts) |
| Extensions | ✅ | uuid-ossp, pg_trgm, pgcrypto |

### Cache Layer: Redis 7+

| Use Case | Data Type | TTL |
|----------|-----------|-----|
| User Sessions | Hash | 24h |
| Rate Limiting | String + INCR | 1min |
| Server Members | Set | 1h |
| Presence | Hash + Pub/Sub | Real-time |
| Feed Cache | Sorted Set | 5min |
| Live Viewer Count | String | Real-time |

---

## Schema Overview

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │──────<│server_members│>──────│   servers    │
└──────────────┘       └──────────────┘       └──────────────┘
       │                                              │
       │                                              │
       ▼                                              ▼
┌──────────────┐                             ┌──────────────┐
│    posts     │                             │   channels   │
└──────────────┘                             └──────────────┘
       │                                              │
       │                                              │
       ▼                                              ▼
┌──────────────┐                             ┌──────────────┐
│post_reactions│                             │channel_msgs  │
└──────────────┘                             └──────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │──────<│conversation_ │>──────│conversations │
│              │       │participants  │       │              │
└──────────────┘       └──────────────┘       └──────────────┘
                                                      │
                                                      ▼
                                             ┌──────────────┐
                                             │  dm_messages │
                                             └──────────────┘

┌──────────────┐       ┌──────────────┐
│    users     │──────<│ live_streams │
└──────────────┘       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │live_chat_msgs│
                       └──────────────┘
```

---

## Table Definitions

### Core Tables

#### `users`

```sql
CREATE TABLE users (
    id              VARCHAR(26) PRIMARY KEY,  -- ULID
    handle          VARCHAR(20) UNIQUE NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    avatar_gradient TEXT[] NOT NULL DEFAULT ARRAY['#ff6b6b', '#4ecdc4'],
    bio             TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT handle_format CHECK (handle ~ '^[a-z0-9_]{3,20}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_handle ON users(handle);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### `user_sessions`

```sql
CREATE TABLE user_sessions (
    id              VARCHAR(26) PRIMARY KEY,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(500) NOT NULL,
    device_info     JSONB,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT refresh_token_unique UNIQUE(refresh_token)
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

#### `user_follows`

```sql
CREATE TABLE user_follows (
    follower_id     VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

---

### Server Tables

#### `servers`

```sql
CREATE TABLE servers (
    id              VARCHAR(26) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    accent          VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
    icon_url        TEXT,
    owner_id        VARCHAR(26) NOT NULL REFERENCES users(id),
    description     TEXT,
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    member_count    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_servers_owner ON servers(owner_id);
CREATE INDEX idx_servers_created_at ON servers(created_at DESC);
```

#### `server_members`

```sql
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'moderator', 'member', 'bot');

CREATE TABLE server_members (
    server_id       VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            member_role NOT NULL DEFAULT 'member',
    nickname        VARCHAR(50),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (server_id, user_id)
);

CREATE INDEX idx_server_members_user ON server_members(user_id);
CREATE INDEX idx_server_members_role ON server_members(server_id, role);
```

#### `channels`

```sql
CREATE TYPE channel_kind AS ENUM ('text', 'voice', 'announcement');

CREATE TABLE channels (
    id              VARCHAR(26) PRIMARY KEY,
    server_id       VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    kind            channel_kind NOT NULL DEFAULT 'text',
    position        INTEGER NOT NULL DEFAULT 0,
    is_nsfw         BOOLEAN NOT NULL DEFAULT FALSE,
    slowmode_seconds INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_channels_server ON channels(server_id);
CREATE INDEX idx_channels_server_position ON channels(server_id, position);
```

#### `channel_messages`

```sql
CREATE TABLE channel_messages (
    id              VARCHAR(26) PRIMARY KEY,
    channel_id      VARCHAR(26) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id       VARCHAR(26) NOT NULL REFERENCES users(id),
    client_id       VARCHAR(50),
    content         TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]'::jsonb,
    is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    reply_to_id     VARCHAR(26) REFERENCES channel_messages(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT channel_client_id_unique UNIQUE(channel_id, client_id)
);

-- Partitioning by month for performance
CREATE INDEX idx_channel_messages_channel_created ON channel_messages(channel_id, created_at DESC);
CREATE INDEX idx_channel_messages_sender ON channel_messages(sender_id);
CREATE INDEX idx_channel_messages_client_id ON channel_messages(channel_id, client_id);
```

---

### Post Tables

#### `posts`

```sql
CREATE TYPE post_visibility AS ENUM ('public', 'friends', 'servers');

CREATE TABLE posts (
    id              VARCHAR(26) PRIMARY KEY,
    author_id       VARCHAR(26) NOT NULL REFERENCES users(id),
    server_id       VARCHAR(26) REFERENCES servers(id),
    content         TEXT NOT NULL,
    visibility      post_visibility NOT NULL DEFAULT 'public',
    
    -- Denormalized counts for performance
    reply_count     INTEGER NOT NULL DEFAULT 0,
    repost_count    INTEGER NOT NULL DEFAULT 0,
    like_count      INTEGER NOT NULL DEFAULT 0,
    bookmark_count  INTEGER NOT NULL DEFAULT 0,
    
    attachments     JSONB DEFAULT '[]'::jsonb,
    reply_to_id     VARCHAR(26) REFERENCES posts(id),
    is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT content_length CHECK (char_length(content) <= 2800)
);

CREATE INDEX idx_posts_author ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_server ON posts(server_id, created_at DESC) WHERE server_id IS NOT NULL;
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_reply_to ON posts(reply_to_id) WHERE reply_to_id IS NOT NULL;
```

#### `post_reactions`

```sql
CREATE TYPE reaction_type AS ENUM ('like', 'repost', 'bookmark');

CREATE TABLE post_reactions (
    post_id         VARCHAR(26) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            reaction_type NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (post_id, user_id, type)
);

CREATE INDEX idx_post_reactions_user ON post_reactions(user_id, type);
CREATE INDEX idx_post_reactions_post_type ON post_reactions(post_id, type);
```

---

### DM Tables

#### `conversations`

```sql
CREATE TYPE conversation_kind AS ENUM ('direct', 'group');

CREATE TABLE conversations (
    id              VARCHAR(26) PRIMARY KEY,
    kind            conversation_kind NOT NULL DEFAULT 'direct',
    name            VARCHAR(100),  -- For group chats
    icon_url        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
```

#### `conversation_participants`

```sql
CREATE TABLE conversation_participants (
    conversation_id VARCHAR(26) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at    TIMESTAMPTZ,
    muted_until     TIMESTAMPTZ,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
```

#### `dm_messages`

```sql
CREATE TYPE message_status AS ENUM ('sending', 'sent', 'delivered', 'read');

CREATE TABLE dm_messages (
    id              VARCHAR(26) PRIMARY KEY,
    conversation_id VARCHAR(26) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       VARCHAR(26) NOT NULL REFERENCES users(id),
    client_id       VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    status          message_status NOT NULL DEFAULT 'sent',
    attachments     JSONB DEFAULT '[]'::jsonb,
    is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
    reply_to_id     VARCHAR(26) REFERENCES dm_messages(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT dm_client_id_unique UNIQUE(conversation_id, client_id)
);

CREATE INDEX idx_dm_messages_conv_created ON dm_messages(conversation_id, created_at DESC);
CREATE INDEX idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX idx_dm_messages_client_id ON dm_messages(conversation_id, client_id);
```

---

### Live Stream Tables

#### `live_categories`

```sql
CREATE TABLE live_categories (
    id              VARCHAR(26) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    icon_url        TEXT,
    tags            TEXT[] DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `live_streams`

```sql
CREATE TYPE stream_status AS ENUM ('idle', 'live', 'ended');
CREATE TYPE latency_mode AS ENUM ('normal', 'low');

CREATE TABLE live_streams (
    id              VARCHAR(26) PRIMARY KEY,
    broadcaster_id  VARCHAR(26) NOT NULL REFERENCES users(id),
    category_id     VARCHAR(26) REFERENCES live_categories(id),
    title           VARCHAR(120) NOT NULL,
    description     TEXT,
    tags            TEXT[] DEFAULT '{}',
    language        VARCHAR(8) NOT NULL DEFAULT 'en',
    is_mature       BOOLEAN NOT NULL DEFAULT FALSE,
    latency_mode    latency_mode NOT NULL DEFAULT 'normal',
    
    status          stream_status NOT NULL DEFAULT 'idle',
    stream_key      VARCHAR(100),
    viewer_count    INTEGER NOT NULL DEFAULT 0,
    peak_viewers    INTEGER NOT NULL DEFAULT 0,
    
    thumbnail_url   TEXT,
    playback_url    TEXT,
    
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_live_streams_broadcaster ON live_streams(broadcaster_id);
CREATE INDEX idx_live_streams_category ON live_streams(category_id) WHERE status = 'live';
CREATE INDEX idx_live_streams_status ON live_streams(status, viewer_count DESC) WHERE status = 'live';
CREATE INDEX idx_live_streams_started_at ON live_streams(started_at DESC) WHERE status = 'live';
```

#### `live_chat_messages`

```sql
CREATE TYPE chat_message_kind AS ENUM ('message', 'subscription', 'donation', 'system');

CREATE TABLE live_chat_messages (
    id              VARCHAR(26) PRIMARY KEY,
    stream_id       VARCHAR(26) NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    kind            chat_message_kind NOT NULL DEFAULT 'message',
    metadata        JSONB DEFAULT '{}'::jsonb,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by stream for efficient queries
CREATE INDEX idx_live_chat_stream_created ON live_chat_messages(stream_id, created_at DESC);
CREATE INDEX idx_live_chat_user ON live_chat_messages(user_id);
```

---

### Notification Tables

#### `notifications`

```sql
CREATE TYPE notification_type AS ENUM (
    'like', 'repost', 'reply', 'mention', 
    'follow', 'dm', 'server_invite', 'system'
);

CREATE TABLE notifications (
    id              VARCHAR(26) PRIMARY KEY,
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    actor_id        VARCHAR(26) REFERENCES users(id),
    target_type     VARCHAR(50),  -- 'post', 'message', 'server', etc.
    target_id       VARCHAR(26),
    data            JSONB DEFAULT '{}'::jsonb,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = FALSE;
```

---

## Indexes

### Performance Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `idx_users_email` | Login lookup |
| `users` | `idx_users_handle` | Profile lookup |
| `posts` | `idx_posts_created_at` | Feed pagination |
| `channel_messages` | `idx_channel_messages_channel_created` | Channel history |
| `dm_messages` | `idx_dm_messages_conv_created` | DM history |
| `live_streams` | `idx_live_streams_status` | Live stream listing |

### Full-Text Search

```sql
-- Posts search
ALTER TABLE posts ADD COLUMN search_vector tsvector;

CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

CREATE FUNCTION posts_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', NEW.content);
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_update
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION posts_search_trigger();
```

---

## Relationships

### Cardinality Summary

| Relationship | Cardinality |
|--------------|-------------|
| User → Posts | 1:N |
| User → Server Memberships | N:M |
| Server → Channels | 1:N |
| Channel → Messages | 1:N |
| User → Conversations | N:M |
| Conversation → Messages | 1:N |
| User → Live Streams | 1:N |
| Live Stream → Chat Messages | 1:N |

---

## Migrations

### Migration Strategy

```
migrations/
├── 000001_init_users.up.sql
├── 000001_init_users.down.sql
├── 000002_init_servers.up.sql
├── 000002_init_servers.down.sql
├── 000003_init_posts.up.sql
├── 000003_init_posts.down.sql
├── 000004_init_dm.up.sql
├── 000004_init_dm.down.sql
├── 000005_init_live.up.sql
├── 000005_init_live.down.sql
├── 000006_init_notifications.up.sql
└── 000006_init_notifications.down.sql
```

### Migration Tool

```bash
# golang-migrate CLI kullanımı
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/xcord?sslmode=disable" up

# Rollback
migrate -path ./migrations -database "..." down 1
```

---

*Sonraki: [Security](./05-security.md)*
