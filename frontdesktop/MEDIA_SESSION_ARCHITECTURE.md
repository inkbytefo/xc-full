# Global Media Session Architecture Plan

> **Status**: PLANNING - Awaiting approval before implementation  
> **Created**: 2025-12-28  
> **Last Updated**: 2025-12-28

---

## 1. Overview

Bu doküman, uygulamadaki tüm medya durumlarını (sesli/görüntülü arama, live stream, screen share) global düzeyde yönetmek için tasarlanan mimariyi açıklar.

### Temel İlkeler

| İlke | Açıklama |
|------|----------|
| **Tek Aktif Oturum** | Aynı anda yalnızca BİR medya oturumu aktif olabilir |
| **Yeni Oturum = Eski Kapanır** | Yeni etkinlik başlatıldığında mevcut oturum otomatik sonlandırılır |
| **PiP Desteği** | Kullanıcı izlediği içeriği sürüklenebilir PiP olarak taşıyabilir |
| **Çift Mod** | Normal Tauri app + Overlay modu (oyun içi) desteklenir |
| **Gelen Arama Kuyruğu** | WhatsApp tarzı, meşgulken gelen aramalar bildirim olarak gösterilir |

---

## 2. Mevcut Durum (Silinecek)

```
src/store/
├── voiceStore.ts     ❌ Silinecek
├── callStore.ts      ❌ Silinecek
```

### Sorunlar
- İki ayrı store birbiriyle koordine değil
- Çakışma yönetimi yok
- PiP desteği yok
- Overlay modu entegrasyonu eksik

---

## 3. Yeni Mimari

### 3.1 MediaSessionStore

```typescript
// src/store/mediaSessionStore.ts

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type SessionType = 
  | 'idle'           // Aktif oturum yok
  | 'dm-voice'       // DM sesli arama
  | 'dm-video'       // DM görüntülü arama
  | 'server-voice'   // Server ses kanalı
  | 'server-video'   // Server hibrit kanal (video)
  | 'live-stream'    // Live stream izleme
  | 'screen-share';  // Screen share izleme

interface SessionContext {
  // DM için
  conversationId?: string;
  otherUserId?: string;
  otherUserName?: string;
  
  // Server için
  serverId?: string;
  serverName?: string;
  channelId?: string;
  channelName?: string;
  
  // Live stream için
  streamId?: string;
  streamerId?: string;
  streamerName?: string;
  
  // Screen share için
  sharingUserId?: string;
  sharingUserName?: string;
}

interface MediaControls {
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

interface PiPState {
  enabled: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface Participant {
  id: string;
  identity: string;
  displayName: string;
  avatarGradient: [string, string];
  isMuted: boolean;
  isSpeaking: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isLocal: boolean;
}

interface IncomingCall {
  id: string;
  type: 'voice' | 'video';
  from: {
    userId: string;
    displayName: string;
    handle: string;
    avatarGradient: [string, string];
  };
  conversationId: string;
  timestamp: number;
  expiresAt: number; // timestamp + 30000ms
}

type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting';

// ═══════════════════════════════════════════════════════════════
// STORE STATE
// ═══════════════════════════════════════════════════════════════

interface MediaSessionState {
  // Ana aktif oturum
  sessionType: SessionType;
  context: SessionContext;
  connection: ConnectionState;
  
  // Medya kontrolleri
  media: MediaControls;
  
  // Katılımcılar (voice/video için)
  participants: Participant[];
  
  // PiP durumu
  pip: PiPState;
  
  // Gelen aramalar kuyruğu
  incomingCalls: IncomingCall[];
  
  // LiveKit bağlantı bilgileri
  livekit: {
    room: Room | null;
    token: string | null;
    serverUrl: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════
// STORE ACTIONS
// ═══════════════════════════════════════════════════════════════

interface MediaSessionActions {
  // Oturum Yönetimi
  startDMCall: (conversationId: string, otherUser: User, type: 'voice' | 'video') => Promise<void>;
  joinServerChannel: (server: Server, channel: Channel) => Promise<void>;
  watchLiveStream: (stream: Stream) => Promise<void>;
  watchScreenShare: (serverId: string, channelId: string, userId: string) => void;
  endSession: () => Promise<void>;
  
  // Medya Kontrolleri
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  
  // PiP Kontrolleri
  enablePiP: () => void;
  disablePiP: () => void;
  updatePiPPosition: (x: number, y: number) => void;
  updatePiPSize: (width: number, height: number) => void;
  
  // Gelen Arama Yönetimi
  receiveIncomingCall: (call: Omit<IncomingCall, 'timestamp' | 'expiresAt'>) => void;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => void;
  
  // Katılımcı Güncellemeleri (internal)
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
}
```

### 3.2 Dosya Yapısı

```
src/
├── store/
│   ├── mediaSessionStore.ts      # Ana store
│   ├── voiceStore.ts             ❌ SİLİNECEK
│   └── callStore.ts              ❌ SİLİNECEK
│
├── features/
│   └── media-session/            # YENİ FEATURE
│       ├── components/
│       │   ├── MediaSessionProvider.tsx    # Context provider
│       │   ├── ActiveSessionOverlay.tsx    # Global overlay
│       │   ├── PiPContainer.tsx            # Sürüklenebilir PiP
│       │   ├── IncomingCallModal.tsx       # Gelen arama bildirimi
│       │   ├── VoiceControlBar.tsx         # Ses kontrolleri
│       │   └── VideoGrid.tsx               # Video tile grid
│       │
│       ├── hooks/
│       │   ├── useMediaSession.ts          # Store hook wrapper
│       │   ├── useLiveKitRoom.ts           # LiveKit entegrasyonu
│       │   ├── useIncomingCallTimeout.ts   # 30sn timeout logic
│       │   └── usePiPDrag.ts               # Drag & drop logic
│       │
│       └── index.ts
```

---

## 4. Bileşen Tasarımı

### 4.1 PiP Container (Sürüklenebilir)

```
┌─────────────────────────────────────────────────────────┐
│  Ana Uygulama Ekranı                                     │
│                                                          │
│    (Kullanıcı başka bir sayfada)                        │
│                                                          │
│                                          ┌─────────────┐│
│                                          │ 🎥 PiP      ││
│                                          │             ││
│                                          │ [Controls]  ││
│                                          │ 🔇 📹 ❌    ││
│                                          └─────────────┘│
│                                          ↑ Draggable    │
└─────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Sürüklenebilir (drag & drop)
- Boyutlandırılabilir (resize handles)
- Minimize edilebilir
- Aktif içeriğe göre farklı görünüm (video/stream/screen share)

### 4.2 Gelen Arama Bildirimi

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │  ╭─────╮                                    │         │
│  │  │ 👤  │  @ahmet sizi arıyor               │         │
│  │  ╰─────╯  Görüntülü Arama                  │         │
│  │                                             │         │
│  │  [🔴 Reddet]              [🟢 Kabul Et]    │         │
│  │                                             │         │
│  │  ████████████░░░░░░░░░░░░ 23sn             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  (Mevcut içerik arka planda devam eder)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Davranış:**
- 30 saniye sonra otomatik kapanır
- Kabul edilirse mevcut oturum sonlandırılır
- Reddedilirse sadece bildirim kapanır
- Birden fazla arama kuyruğa alınır

### 4.3 Overlay Modu (Oyun İçi)

```
Overlay Widget (Ghost Mode):
┌───────────────────────────────────────────┐
│  🎮 pink Overlay                          │
│  ─────────────────────────────────        │
│  🔇 Muted | #voice-chat | 3 kişi          │
│  ─────────────────────────────────        │
│  👤 Mehmet (konuşuyor)                    │
│  👤 Ahmet                                  │
│  👤 Sen                                    │
│  ─────────────────────────────────        │
│  [🔊] [🎧] [📹] [🖥️] [📴]                │
└───────────────────────────────────────────┘
```

---

## 5. Oturum Geçiş Akışları

### 5.1 Yeni Oturum Başlatma

```
User Action → Check Active Session → End if exists → Start New Session

Örnek: Kullanıcı live stream izlerken DM araması kabul ediyor

1. incomingCalls'a arama eklenir
2. Kullanıcı "Kabul Et"e tıklar
3. acceptCall() çağrılır:
   a. endSession() → Live stream sonlandırılır
   b. startDMCall() → Yeni arama başlatılır
4. UI güncellenir
```

### 5.2 PiP Aktivasyonu

```
User navigates away from active session page:

1. Route değişikliği algılanır
2. Aktif oturum varsa → enablePiP()
3. PiP container render edilir
4. Kullanıcı geri dönerse → disablePiP()
```

---

## 6. Implementation Phases

### Phase 1: Store & Types (2-3 saat)
- [ ] `mediaSessionStore.ts` oluştur
- [ ] Tüm type tanımlarını yaz
- [ ] Temel actions implement et
- [ ] Eski store'ları devre dışı bırak

### Phase 2: LiveKit Entegrasyonu (3-4 saat)
- [ ] `useLiveKitRoom.ts` hook'u yaz
- [ ] Room bağlantı yönetimi
- [ ] Participant senkronizasyonu
- [ ] Media track yönetimi

### Phase 3: UI Components (4-5 saat)
- [ ] `PiPContainer.tsx` - Sürüklenebilir PiP
- [ ] `IncomingCallModal.tsx` - Gelen arama UI
- [ ] `ActiveSessionOverlay.tsx` - Global overlay
- [ ] `VoiceControlBar.tsx` - Kontrol butonları

### Phase 4: Entegrasyon (3-4 saat)
- [ ] DM arama entegrasyonu
- [ ] Server ses/video kanal entegrasyonu
- [ ] Live stream entegrasyonu
- [ ] Overlay modu entegrasyonu

### Phase 5: Cleanup & Test (2-3 saat)
- [ ] Eski `voiceStore.ts` sil
- [ ] Eski `callStore.ts` sil
- [ ] Tüm eski referansları güncelle
- [ ] E2E test senaryoları

---

## 7. Risk ve Dikkat Edilecekler

| Risk | Çözüm |
|------|-------|
| LiveKit bağlantı kesintisi | Reconnection logic, connection state UI |
| Çoklu arama çakışması | Kuyruk sistemi, clear timeout on accept/reject |
| PiP performans sorunları | RequestAnimationFrame, will-change CSS |
| Overlay mode senkronizasyonu | Shared state via Tauri IPC events |

---

## 8. Mevcut Kullanımları Güncellenecek Dosyalar

```
src/features/dm/components/DmChatArea.tsx
src/features/voice/components/GlobalVoiceSessionModal.tsx
src/features/servers/components/VoiceOverlay.tsx
src/features/servers/components/VideoRoomView.tsx
src/features/servers/components/HybridChatArea.tsx
src/features/live/components/LivePlayer.tsx
src/App.tsx (Provider eklenecek)
```

---

## Onay Bekleniyor

Bu mimari planı onaylıyor musunuz? Onay sonrası Phase 1'den başlayarak implementasyona geçilecek.
