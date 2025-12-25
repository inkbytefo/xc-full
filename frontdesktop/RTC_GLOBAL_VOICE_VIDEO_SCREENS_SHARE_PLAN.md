# Uygulama Geneli Sesli/Görüntülü Sohbet + Ekran Paylaşımı: Global State ve Mimari Plan

## Mevcut Durum (Kod Taraması Özeti)

### RTC (Ses/Görüntü/Ekran Paylaşımı)
- RTC altyapısı LiveKit ile kurulmuş durumda.
- Global ses durumları Zustand store içinde tutuluyor: [voiceStore.ts](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/store/voiceStore.ts#L1-L290)
  - `Room` instance’ı store içinde saklanıyor (`room: Room | null`).
  - `connect(channel)`, `disconnect()`, `toggleMute()`, `toggleCamera()`, `toggleScreenShare()` doğrudan LiveKit API’lerini çağırıyor.
  - Katılımcı listesi `RoomEvent.*` event’leri ile güncelleniyor.

### Ana Uygulama (Main Window) Yaşam Döngüsü
- Ses bağlantısı route değişimlerinden bağımsız yönetiliyor:
  - `GlobalVoiceSessionModal` root layout’ta her zaman render ediliyor: [router.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/router.tsx#L21-L31)
  - Bu sayede kullanıcı bir ses kanalındayken feed, dm, live vb. sayfalara geçse bile bağlantı kopmuyor.
- Ses kanalına katılma çıkma akışı:
  - `ServersPage` içinde `voiceStore.connect(channel)` çağrısı yapılıyor: [ServersPage.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/features/servers/ServersPage.tsx#L75-L89)

### Overlay (Tauri Ayrı Window) Durumu
- Overlay ayrı bir entrypoint ile açılıyor: [overlay-main.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/overlay-main.tsx#L1-L28)
- Overlay UI tarafında da `useVoiceStore()` kullanımı var:
  - Örn. voice kontrol widget’ı: [VoiceWidget.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/features/overlay/widgets/VoiceWidget.tsx#L78-L90)
  - Overlay içinden ses kanalına join tetiklenebiliyor: [ServerWidget.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/features/overlay/widgets/ServerWidget.tsx#L116-L123)

### Kritik Risk / Root Cause
- Overlay ve main window iki ayrı WebView/JS runtime olduğu için:
  - Zustand store state’i paylaşılmaz.
  - Overlay `useVoiceStore().connect()` çağırırsa, aynı kullanıcı adına ikinci bir LiveKit bağlantısı açma riski oluşur.
- Sonuç: Duplicate participant, aynı anda iki bağlantı, track karmaşası, permission prompt çakışması ve “kopma” hissi.

### Realtime Chat (WebSocket) Durumu
- WebSocket global provider ile yönetiliyor:
  - Main window: [main.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/main.tsx#L10-L19), [WebSocketProvider.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/lib/websocket/WebSocketProvider.tsx#L11-L53)
  - Overlay: [overlay-main.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/overlay-main.tsx#L17-L21)
- Chat realtime cache sync React Query köprüsü ile yapılıyor:
  - [useRealtimeSync.ts](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/lib/query/useRealtimeSync.ts#L21-L77)

## Hedef Mimari (Global State / Bağlantı Kopmaması / Overlay + Main Aynı Mantık)

### Ana İlke
Uygulama genelinde tek bir “RTC Session Owner” olmalı. Canlı LiveKit `Room` yalnızca bu owner window’da açılmalı. Diğer tüm UI’lar (route’lar, modal’lar, overlay) owner’a komut gönderip state’i aynalamalı.

### 1) RTC Session Owner / Follower Modeli
- Owner:
  - LiveKit `Room` instance’ını yönetir.
  - Mikrofon/kamera/ekran paylaşımı izinlerini ister ve track publish/unpublish işlemlerini yapar.
  - State snapshot yayınlar (connected, channel, participants, mute, screen share, error vb.).
- Follower:
  - LiveKit’e bağlanmaz.
  - Kullanıcı etkileşimiyle komut üretir (connect/disconnect/mute/screen share) ve owner’a yollar.
  - Owner’dan gelen snapshot ile UI render eder.

### 2) Overlay ↔ Main Komut/State Bus
Overlay ayrı window olduğundan, “shared store” yerine explicit bir bus gerekir.

Önerilen öncelik:
1. BroadcastChannel (aynı origin içi pub/sub)
2. Fallback: localStorage “storage event”
3. Alternatif: Tauri event/IPC (daha kontrollü ama daha ağır)

Önerilen mesaj tipleri:
- `VOICE_OWNER_HEARTBEAT`: owner “ben buradayım” sinyali
- `VOICE_COMMAND`: follower → owner (connect/disconnect/toggleMute/toggleCamera/toggleScreenShare)
- `VOICE_STATE_SNAPSHOT`: owner → follower (minimal UI state)

### 3) Owner Seçimi (Leader Election) ve Handoff
Hedef davranış:
- Main window açıkken owner main olsun.
- Main kapanırsa overlay’de iki seçenek:
  - (Basit) RTC kontrolünü devre dışı bırak, kullanıcıya “ana uygulamayı aç” bildirimi göster.
  - (Gelişmiş) Overlay owner’a geçsin (handoff) ve RTC’yi o yönetsin.

Pratik yaklaşım:
- Her window bir `instanceId` üretir (ör. [newClientId()](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/lib/clientId.ts#L5-L11)).
- Owner düzenli heartbeat yayınlar.
- Follower heartbeat gördükçe owner olmadığına karar verir.
- Heartbeat timeout olursa follower owner olmaya aday olur (bu aşama opsiyonel).

### 4) UI Entegrasyonu (Tek Global Mantık)
- Main:
  - `voiceStore` owner modunda çalışır: komutları uygular ve snapshot yayınlar.
  - `GlobalVoiceSessionModal` zaten global yüzey: [GlobalVoiceSessionModal.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/features/voice/components/GlobalVoiceSessionModal.tsx#L15-L156)
- Overlay:
  - `useVoiceStore.connect()` gibi RTC’ye giden çağrılar kaldırılır.
  - Overlay’de “mirror voice store” (yalnızca snapshot state) tutulur.
  - Overlay UI’ları bu store üzerinden beslenir.
  - Join/mute/screen share gibi aksiyonlar `VOICE_COMMAND` olarak owner’a gönderilir.

### 5) Ekran Paylaşımı (Permission / Focus / Gesture)
- `setScreenShareEnabled(true)` tipik olarak `getDisplayMedia` yolunu tetikler ve:
  - user gesture gerektirir,
  - aktif/focus’lu window’da permission prompt göstermek daha sağlıklıdır.
- Bu nedenle overlay’den ekran paylaşımı istense bile permission akışı owner window’da yönetilmelidir.

### 6) Track Modeli ve Video/Screenshare Görselleştirme
Mevcut store, kamera video track’ini çekiyor, screenshare’i boolean tutuyor:
- [voiceStore.ts](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/store/voiceStore.ts#L52-L69)

İyileştirme hedefi:
- Participant için kamera ve screenshare track’lerini ayrı modellemek:
  - `cameraTrack`
  - `screenShareTrack`
- Ana uygulamada “screen share tile” gösterebilmek.
- Overlay’de track render etmeye çalışmamak; sadece state (kim paylaşıyor, açık/kapalı) göstermek.

## Uygulama Planı (Sıralı Teslimat)

### Aşama 1 (Güvenli Temel) — Owner/Follower ve Overlay’i Follower Yapma
- BroadcastChannel tabanlı bir voice bus ekle.
- Main window’u “default owner” yap:
  - gelen komutları uygula,
  - periyodik heartbeat + state snapshot yayınla.
- Overlay’de LiveKit bağlantısını tamamen devre dışı bırak:
  - `connect/toggle*` aksiyonlarını komut olarak owner’a yolla,
  - snapshot’ı takip et ve UI’yı bundan çiz.
- Overlay tarafında `ServerWidget` içindeki `connect(channel)` akışını komut üretmeye çevir:
  - [ServerWidget.tsx](file:///C:/Users/tpoyr/OneDrive/Desktop/xc/frontdesktop/src/features/overlay/widgets/ServerWidget.tsx#L116-L123)

### Aşama 2 (State Kapsamını Genişletme)
- Snapshot state’ini UI ihtiyaçlarına göre genişlet:
  - activeChannel info, participants, speaking, muted, screen sharing, connecting, error.
- Overlay widget’ları bu state ile tek kaynaktan güncelle.

### Aşama 3 (Video/Screenshare Deneyimini Tamamlama)
- Participant track modelini iyileştir.
- Main window video odasında screenshare tile desteği ekle.
- Overlay’de “paylaşım başladı/durdu” ve “paylaşan kişi” gibi durumları net göster.

### Aşama 4 (Dayanıklılık)
- Reconnect stratejisi (network kesilmesi, server restart).
- Token yenileme/expired akışı.
- Idempotent komutlar (aynı komut iki kez gelirse yan etkisiz).
- İsteğe bağlı owner handoff (main kapanınca overlay owner olabilir).

