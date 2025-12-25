# XCORD Backend - Real-time Communication

> Versiyon: 1.0 | Tarih: 2025-12-21

---

## 📋 İçindekiler

1. [WebSocket Architecture](#websocket-architecture)
2. [Event System](#event-system)
3. [Presence System](#presence-system)
4. [Implementation](#implementation)
5. [Scaling Considerations](#scaling-considerations)

---

## WebSocket Architecture

### Connection Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    Client    │         │  API Server  │         │    Redis     │
│   (Tauri)    │         │ (Go/Fiber)   │         │   Pub/Sub    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ 1. HTTP Upgrade        │                        │
       │ GET /api/v1/ws         │                        │
       │ Authorization: Bearer  │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │ 2. Validate JWT        │
       │                        │                        │
       │ 3. 101 Switching       │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │ 4. Send: HELLO         │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 5. Recv: HELLO_ACK     │ 6. SUBSCRIBE           │
       │<───────────────────────│───────────────────────>│
       │                        │ user:{id}:events       │
       │                        │                        │
       │ 7. Subscribe channels  │ 8. SUBSCRIBE           │
       │ [dm.*, server.srv_1.*] │───────────────────────>│
       │───────────────────────>│ dm:{user}, server:srv_1│
       │                        │                        │
       │ 9. Events flow         │ PUBLISH                │
       │<───────────────────────│<───────────────────────│
       │                        │                        │
```

### Connection States

```
┌─────────┐    connect    ┌───────────┐    auth     ┌─────────────┐
│CONNECTING├──────────────>│AUTHENTICATING├─────────>│  CONNECTED  │
└─────────┘               └───────────┘             └──────┬──────┘
                                                          │
                          ┌───────────┐   heartbeat       │
                          │ RECONNECT │<──────miss────────┤
                          └─────┬─────┘                   │
                                │                         │
                                └─────────────────────────┘
                                        reconnect
```

---

## Event System

### Event Types

#### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `HELLO` | `{ token: string }` | Initial auth |
| `SUBSCRIBE` | `{ channels: string[] }` | Subscribe to channels |
| `UNSUBSCRIBE` | `{ channels: string[] }` | Unsubscribe |
| `PING` | `{}` | Heartbeat |
| `TYPING_START` | `{ channelId: string }` | Typing indicator |
| `TYPING_STOP` | `{ channelId: string }` | Stop typing |

#### Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `HELLO_ACK` | `{ sessionId, heartbeatInterval }` | Auth success |
| `PONG` | `{ timestamp }` | Heartbeat response |
| `EVENT` | `{ event, payload }` | Domain event |
| `ERROR` | `{ code, message }` | Error |

### Domain Events

```typescript
// DM Events
type DMNewMessage = {
  event: "dm.message.new";
  payload: {
    message: Message;
  };
};

type DMMessageRead = {
  event: "dm.message.read";
  payload: {
    conversationId: string;
    messageId: string;
    readAt: string;
  };
};

type DMTyping = {
  event: "dm.typing";
  payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };
};

// Server Events
type ServerNewMessage = {
  event: "server.message.new";
  payload: {
    serverId: string;
    channelId: string;
    message: ChannelMessage;
  };
};

type ServerMemberPresence = {
  event: "server.member.presence";
  payload: {
    serverId: string;
    userId: string;
    presence: "online" | "idle" | "dnd" | "offline";
  };
};

type ServerMemberJoin = {
  event: "server.member.join";
  payload: {
    serverId: string;
    member: ServerMember;
  };
};

// Notification Events
type NotificationNew = {
  event: "notification.new";
  payload: {
    notification: Notification;
  };
};

// Live Events
type LiveChatMessage = {
  event: "live.chat.message";
  payload: {
    streamId: string;
    message: ChatMessage;
  };
};

type LiveViewerCount = {
  event: "live.viewer.count";
  payload: {
    streamId: string;
    count: number;
  };
};
```

### Channel Naming Convention

```
# User-specific channels
user:{userId}:notifications
user:{userId}:presence

# DM channels
dm:{conversationId}

# Server channels
server:{serverId}
server:{serverId}:channel:{channelId}
server:{serverId}:voice:{channelId}

# Live stream channels
live:{streamId}:chat
live:{streamId}:status
```

---

## Presence System

### Presence States

| State | Description | Trigger |
|-------|-------------|---------|
| `online` | Active | Foreground app |
| `idle` | Away | 5 min inactivity |
| `dnd` | Do not disturb | User set |
| `offline` | Disconnected | No connection |

### Presence Flow

```
┌──────────────┐                     ┌──────────────┐
│    Client    │                     │    Server    │
└──────┬───────┘                     └──────┬───────┘
       │                                    │
       │ WS Connect                         │
       │───────────────────────────────────>│
       │                                    │
       │                                    │ Set presence: online
       │                                    │ TTL: 60s
       │                                    │ Store in Redis
       │                                    │
       │ Heartbeat (every 30s)              │
       │───────────────────────────────────>│
       │                                    │ Refresh TTL
       │                                    │
       │ User inactive (5 min)              │
       │ SET_PRESENCE: idle                 │
       │───────────────────────────────────>│
       │                                    │ Broadcast to servers
       │                                    │
       │ Disconnect                         │
       │──────────X                         │
       │                                    │ TTL expires
       │                                    │ Set offline
       │                                    │ Broadcast to servers
```

### Redis Structure

```
# Presence hash for each user
HSET presence:{userId} status "online" last_seen 1735776000

# Server online members set
SADD server:{serverId}:online {userId}

# Expiring presence key
SETEX presence:{userId}:alive 60 1
```

---

## Implementation

### WebSocket Hub

```go
// internal/adapters/websocket/hub.go
package websocket

import (
    "context"
    "sync"
    
    "github.com/go-redis/redis/v9"
)

type Hub struct {
    clients    map[string]*Client
    register   chan *Client
    unregister chan *Client
    broadcast  chan *Event
    redis      *redis.Client
    mu         sync.RWMutex
}

func NewHub(redis *redis.Client) *Hub {
    return &Hub{
        clients:    make(map[string]*Client),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        broadcast:  make(chan *Event, 256),
        redis:      redis,
    }
}

func (h *Hub) Run(ctx context.Context) {
    // Subscribe to Redis pubsub
    pubsub := h.redis.PSubscribe(ctx, "events:*")
    redisCh := pubsub.Channel()
    
    for {
        select {
        case client := <-h.register:
            h.addClient(client)
            
        case client := <-h.unregister:
            h.removeClient(client)
            
        case msg := <-redisCh:
            h.handleRedisMessage(msg)
            
        case <-ctx.Done():
            return
        }
    }
}

func (h *Hub) addClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    h.clients[client.ID] = client
    
    // Set online presence
    h.redis.HSet(context.Background(), 
        fmt.Sprintf("presence:%s", client.UserID),
        "status", "online",
        "last_seen", time.Now().Unix(),
    )
    h.redis.Expire(context.Background(), 
        fmt.Sprintf("presence:%s", client.UserID),
        time.Minute,
    )
}

func (h *Hub) removeClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    if _, ok := h.clients[client.ID]; ok {
        delete(h.clients, client.ID)
        close(client.send)
    }
}

func (h *Hub) handleRedisMessage(msg *redis.Message) {
    // Parse channel: events:{channel}
    channel := strings.TrimPrefix(msg.Channel, "events:")
    
    var event Event
    if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
        return
    }
    
    h.mu.RLock()
    defer h.mu.RUnlock()
    
    for _, client := range h.clients {
        if client.IsSubscribed(channel) {
            select {
            case client.send <- &event:
            default:
                // Client buffer full, skip
            }
        }
    }
}
```

### WebSocket Client

```go
// internal/adapters/websocket/client.go
package websocket

import (
    "time"
    
    "github.com/gorilla/websocket"
)

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10
    maxMessageSize = 4096
)

type Client struct {
    ID           string
    UserID       string
    hub          *Hub
    conn         *websocket.Conn
    send         chan *Event
    subscriptions map[string]bool
    mu           sync.RWMutex
}

func (c *Client) ReadPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()
    
    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })
    
    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            break
        }
        
        c.handleMessage(message)
    }
}

func (c *Client) WritePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()
    
    for {
        select {
        case event, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            
            if err := c.conn.WriteJSON(event); err != nil {
                return
            }
            
        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

func (c *Client) handleMessage(data []byte) {
    var msg ClientMessage
    if err := json.Unmarshal(data, &msg); err != nil {
        return
    }
    
    switch msg.Type {
    case "SUBSCRIBE":
        c.handleSubscribe(msg.Payload)
    case "UNSUBSCRIBE":
        c.handleUnsubscribe(msg.Payload)
    case "TYPING_START":
        c.handleTypingStart(msg.Payload)
    case "TYPING_STOP":
        c.handleTypingStop(msg.Payload)
    case "PING":
        c.send <- &Event{Type: "PONG", Payload: map[string]interface{}{
            "timestamp": time.Now().UnixMilli(),
        }}
    }
}

func (c *Client) Subscribe(channel string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.subscriptions[channel] = true
}

func (c *Client) IsSubscribed(channel string) bool {
    c.mu.RLock()
    defer c.mu.RUnlock()
    
    // Check exact match
    if c.subscriptions[channel] {
        return true
    }
    
    // Check wildcard (server:srv_1 matches server:srv_1:*)
    for sub := range c.subscriptions {
        if strings.HasPrefix(channel, sub) {
            return true
        }
    }
    
    return false
}
```

### Event Publisher

```go
// internal/infrastructure/events/publisher.go
package events

import (
    "context"
    "encoding/json"
    
    "github.com/go-redis/redis/v9"
)

type Publisher struct {
    redis *redis.Client
}

func NewPublisher(redis *redis.Client) *Publisher {
    return &Publisher{redis: redis}
}

func (p *Publisher) Publish(ctx context.Context, channel string, event interface{}) error {
    data, err := json.Marshal(event)
    if err != nil {
        return err
    }
    
    return p.redis.Publish(ctx, "events:"+channel, data).Err()
}

// Helper methods
func (p *Publisher) PublishDMMessage(ctx context.Context, conversationID string, msg *Message) error {
    return p.Publish(ctx, fmt.Sprintf("dm:%s", conversationID), Event{
        Type: "dm.message.new",
        Payload: map[string]interface{}{
            "message": msg,
        },
    })
}

func (p *Publisher) PublishServerMessage(ctx context.Context, serverID, channelID string, msg *ChannelMessage) error {
    return p.Publish(ctx, fmt.Sprintf("server:%s:channel:%s", serverID, channelID), Event{
        Type: "server.message.new",
        Payload: map[string]interface{}{
            "serverId":  serverID,
            "channelId": channelID,
            "message":   msg,
        },
    })
}

func (p *Publisher) PublishPresence(ctx context.Context, serverID, userID, presence string) error {
    return p.Publish(ctx, fmt.Sprintf("server:%s", serverID), Event{
        Type: "server.member.presence",
        Payload: map[string]interface{}{
            "serverId": serverID,
            "userId":   userID,
            "presence": presence,
        },
    })
}

func (p *Publisher) PublishNotification(ctx context.Context, userID string, notif *Notification) error {
    return p.Publish(ctx, fmt.Sprintf("user:%s:notifications", userID), Event{
        Type: "notification.new",
        Payload: map[string]interface{}{
            "notification": notif,
        },
    })
}
```

---

## Scaling Considerations

### Multi-Node Architecture

```
                        ┌─────────────────┐
                        │  Load Balancer  │
                        │   (sticky WS)   │
                        └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
│  API Node 1   │        │  API Node 2   │        │  API Node 3   │
│   WS Hub 1    │        │   WS Hub 2    │        │   WS Hub 3    │
└───────┬───────┘        └───────┬───────┘        └───────┬───────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   Redis Pub/Sub │
                        │    (Cluster)    │
                        └─────────────────┘
```

### Key Points

1. **Sticky Sessions**: WebSocket connections need sticky sessions or connection affinity
2. **Redis Pub/Sub**: All nodes subscribe to Redis for cross-node event delivery
3. **Presence Sync**: Redis stores canonical presence state
4. **Horizontal Scaling**: Add more API nodes as load increases

### Connection Distribution

```go
// Load balancer configuration for sticky sessions
// nginx example:
// upstream websocket {
//     ip_hash;  // or use consistent hashing
//     server api1:8080;
//     server api2:8080;
//     server api3:8080;
// }
```

---

*Sonraki: [Deployment](./07-deployment.md)*
