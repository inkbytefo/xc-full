# Pink Live Streaming Roadmap

Twitch/Kick benzeri profesyonel yayıncılık altyapısı için teknik analiz ve yol haritası.

> **Son Güncelleme:** 28.12.2025  
> **Durum:** Faz 3 - Stream Chat System (Aktif)

---

## 1. Mevcut XC Live Altyapısı Analizi

### A. Backend Yapısı (Go)

| Dosya | İçerik | Durum |
|:---|:---|:---|
| `domain/live/entity.go` | Stream, Category, StreamStatus | ✅ Temel yapı var |
| `infrastructure/postgres/stream_repo.go` | CRUD operasyonları | ✅ Bağlantı hazır |
| `adapters/http/handlers/live.go` | REST endpoints | ✅ API katmanı hazır |
| `infrastructure/livekit/` | LiveKit entegrasyonu | ✅ Voice/Video altyapısı |

### B. Mevcut Stream Entity

```go
type Stream struct {
    ID           string
    UserID       string
    Title        string
    StreamKey    string       // ✅ OBS için anahtar
    Status       StreamStatus // offline, live, ending
    ViewerCount  int
    Category     *Category
    // ...
}
```

### C. Frontend Yapısı (React)

| Dosya | İçerik | Durum |
|:---|:---|:---|
| `LivePage.tsx` | Stream listesi, viewer UI | ✅ Temel UI var |
| `liveApi.ts` | API fonksiyonları | ✅ CRUD hazır |

### D. Eksikler

| Özellik | Twitch/Kick | XC Mevcut |
|:---|:---|:---|
| RTMP/SRT Ingest | ✅ | ❌ Yok |
| HLS Transcoding | ✅ | ❌ Yok |
| ABR (Adaptive Bitrate) | ✅ | ❌ Yok |
| Video Player | ✅ | ❌ Placeholder |
| Chat Senkronizasyonu | ✅ | ❌ Yok |
| Go Live Notification | ✅ | ❌ Yok |
| Clip Sistemi | ✅ | ❌ Yok |

---

## 2. Broadcasting Mimarisi

### The Pipeline (Yayın Hattı)

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│    OBS      │────▶│  Ingest Server  │────▶│  Transcoder │────▶│     CDN      │
│  (Streamer) │RTMP │  (RTMP/SRT)     │     │  (FFmpeg)   │     │  (HLS/DASH)  │
└─────────────┘     └─────────────────┘     └─────────────┘     └──────────────┘
                            │                                          │
                            │                                          ▼
                            │                                   ┌──────────────┐
                            └──────────────────────────────────▶│   Viewers    │
                                      (Stream Key Auth)         │  (hls.js)    │
                                                                └──────────────┘
```

---

## 3. Teknik Implementasyon

### A. Media Server Seçenekleri

| Engine | Özellikler | Tavsiye |
|:---|:---|:---|
| **OvenMediaEngine** | Sub-second latency, WebRTC çıkış | ✅ Önerilen |
| **SRS (Simple Realtime Server)** | Hafif, RTMP/HLS | Alternatif |
| **AWS IVS** | Managed, ölçeklenebilir | Pahalı |
| **LiveKit (Mevcut)** | Voice/Video, WebRTC | ❌ Broadcast için uygun değil |

### B. OvenMediaEngine Entegrasyonu

```yaml
# docker-compose.yml - OME eklentisi
services:
  ome:
    image: airensoft/ovenmediaengine:latest
    ports:
      - "1935:1935"   # RTMP Ingest
      - "9999:9999"   # SRT Ingest
      - "3333:3333"   # LL-HLS output
      - "3334:3334"   # API
    volumes:
      - ./ome-config:/opt/ovenmediaengine/bin/origin_conf
```

### C. Stream Key Authentication

```go
// handlers/live.go - Stream key doğrulama
func (h *LiveHandler) AuthenticateStreamKey(c *fiber.Ctx) error {
    streamKey := c.Query("key") // OBS RTMP URL: rtmp://xc.com/live?key=xxx
    
    stream, err := h.streamRepo.FindByStreamKey(c.Context(), streamKey)
    if err != nil {
        return c.Status(401).JSON(fiber.Map{"error": "Invalid stream key"})
    }
    
    // Stream'i live yap
    stream.Status = live.StatusLive
    stream.StartedAt = time.Now()
    h.streamRepo.Update(c.Context(), stream)
    
    // Takipçilere bildirim gönder
    go h.notifyFollowers(stream.UserID, stream.ID)
    
    return c.JSON(fiber.Map{"status": "authenticated"})
}
```

### D. HLS Playlist Endpoint

```go
// Stream HLS endpoint
func (h *LiveHandler) GetHLSPlaylist(c *fiber.Ctx) error {
    streamID := c.Params("id")
    
    // OvenMediaEngine HLS URL'i proxy et
    omeURL := fmt.Sprintf("http://ome:3333/app/%s/playlist.m3u8", streamID)
    
    return c.Redirect(omeURL, 302)
}
```

---

## 4. Frontend Video Player

### A. HLS.js Entegrasyonu

```typescript
// features/live/VideoPlayer.tsx
import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    streamId: string;
    onError?: (error: Error) => void;
}

export function VideoPlayer({ streamId, onError }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        const hlsUrl = `/api/v1/live/streams/${streamId}/playlist.m3u8`;

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                backBufferLength: 5,
            });
            
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;

            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) onError?.(new Error(data.type));
            });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS
            videoRef.current.src = hlsUrl;
        }

        return () => hlsRef.current?.destroy();
    }, [streamId]);

    return (
        <video
            ref={videoRef}
            className="w-full aspect-video bg-black"
            controls
            autoPlay
            muted
        />
    );
}
```

### B. Stream Chat Bileşeni

```typescript
// features/live/StreamChat.tsx
interface StreamChatProps {
    streamId: string;
}

export function StreamChat({ streamId }: StreamChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        ws.current = new WebSocket(`wss://api.xc.com/ws/live/${streamId}/chat`);
        
        ws.current.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            setMessages(prev => [...prev.slice(-100), msg]); // Son 100 mesaj
        };

        return () => ws.current?.close();
    }, [streamId]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                {messages.map(msg => (
                    <ChatMessage key={msg.id} {...msg} />
                ))}
            </div>
            <ChatInput streamId={streamId} />
        </div>
    );
}
```

---

## 5. Creator Dashboard

### A. Yeni Endpoint'ler

| Endpoint | Method | Açıklama |
|:---|:---|:---|
| `GET /me/stream` | Streamer'ın stream'i |
| `POST /me/stream/regenerate-key` | Yeni stream key |
| `GET /me/stream/analytics` | İzleyici istatistikleri |

### B. Dashboard UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Creator Dashboard                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stream Key: live_user_abc123...     [📋 Kopyala] [🔄 Sıfırla] │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Yayın Başlığı: _________________________________        │  │
│  │ Kategori:      [▼ Valorant                    ]         │  │
│  │ [ ] 18+ İçerik                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📊 Son Yayın İstatistikleri                                   │
│  ├─ Maksimum İzleyici: 1,234                                   │
│  ├─ Ortalama İzleyici: 856                                     │
│  └─ Süre: 2sa 45dk                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Yol Haritası

### Faz 1: Media Server Kurulumu (1 Hafta) ✅

| Görev | Açıklama | Durum |
|:---|:---|:---:|
| OvenMediaEngine Docker | RTMP/SRT ingest container | ✅ |
| Server.xml Konfigürasyonu | LL-HLS output, webhook ayarları | ✅ |
| Stream key auth webhook | Pink backend callback endpoint | ✅ |
| Stream entity güncelleme | IngestURL, PlaybackURL alanları | ✅ |
| HLS proxy endpoint | CDN-ready playback URL | ✅ |
| Database migration | Yeni alanlar için SQL | ✅ |

### Faz 2: Backend Entegrasyonu (2 Hafta) ✅

| Görev | Açıklama |
|:---|:---|
| Stream lifecycle | Start/End events ✅ |
| Go Live notification | Push notification ✅ |
| Viewer Count Tracking | Real-time sayaç ✅ |
| HLS proxy endpoint | CDN ready (Deferred) |

### Phase 3: Stream Chat System (Completed)
- [x] **Stream Chat Message Entity**: Define `ChatMessage` struct and repository interface.
- [x] **WebSocket Chat Endpoint**: Implement `STREAM_CHAT` event handling in WebSocket hub.
- [x] **Chat Message Repository**: Implement persistence for chat messages.
- [x] **Stream Chat History**: `GET /live/streams/:id/messages` endpoint.

### Phase 4: Creator Dashboard (Completed)

| Görev | Açıklama |
|:---|:---|
| Stream key yönetimi | Regenerate key (`POST /live/me/regenerate-key`) ✅ |
| Yayın bilgisi düzenleme | Title, category (`PUT /live/me`) ✅ |
| Temel analytics | Viewer graphs (`GET /live/me/analytics`) ✅ |

### Faz 5: Gelişmiş Özellikler (Devam Ediyor)

| Görev | Açıklama |
|:---|:---|
| VOD kayıt | Yayın arşivi (`recordings` table + OME File Publisher) ✅ |
| Clipping sistemi | Son 30sn kesme |
| CDN entegrasyonu | Cloudflare/AWS |
| Transcode kalite seçenekleri | 1080p/720p/480p |

---

## 7. Maliyet Hesaplaması

### Bant Genişliği

| İzleyici | Süre | Kalite | Trafik |
|:---|:---|:---|:---|
| 100 | 1 saat | 1080p | ~200 GB |
| 1,000 | 1 saat | 1080p | ~2 TB |
| 10,000 | 1 saat | 1080p | ~20 TB |

### Maliyet Optimizasyonu Stratejisi

1. **Partner Sistemi:** Sadece popüler yayıncılara 1080p60
2. **Varsayılan Limit:** Normal kullanıcılara 720p30
3. **Transcode Havuzu:** Her kalite için FFmpeg sunucuları
4. **CDN:** Cloudflare (ücretsiz tier başlangıç için)

---

## 8. Sonuç

XC'nin mevcut **Go + LiveKit + React** altyapısı broadcating için iyi bir temel sunuyor:

✅ **Mevcut Avantajlar:**
- Stream entity ve API zaten var
- WebSocket altyapısı (chat için)
- LiveKit voice/video deneyimi

⚠️ **Kritik Eksikler:**
1. RTMP/SRT Ingest (OvenMediaEngine)
2. HLS Transcoding (FFmpeg)
3. Video Player (hls.js)
4. Go Live Notification

> [!WARNING]
> Video yayıncılığı **çok pahalıdır**. Başlangıçta düşük limitlerle açın ve ölçeklendirin.

> [!TIP]
> LiveKit şu an voice için kullanılıyor. Broadcasting için **ayrı bir medya sunucusu** (OvenMediaEngine) gerekiyor. Bunlar birbirini tamamlar, çakışmaz.
