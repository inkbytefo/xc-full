# XCORD Roadmap (MVP → Production)

> Son Güncelleme: 2025-12-21

Bu roadmap, mevcut prototipin (Tauri v2 + React + Tailwind) üretim-kalitesine doğru evrilmesi için hedefleri, aşamaları ve teslim çıktıları tanımlar.

---

## Mevcut Durum (Tamamlanan)

### ✅ Temel Altyapı
- [x] UI altyapısı: sabit `MainSidebar` + arkaplan `DotWaveCanvas`
- [x] URL-tabanlı routing: React Router ile tüm modüller
- [x] Feature-based mimari: `src/features/` altında modüller

### ✅ Feed Modülü
- [x] Cursor pagination ile infinite scroll
- [x] Post oluşturma (visibility seçimi)
- [x] Like/Repost/Bookmark toggle (optimistic)
- [x] Filtreleme: all / friends / servers
- [x] Sunucu/kullanıcı araması

### ✅ DM Modülü
- [x] Konuşma listesi (son mesaj preview, unread count)
- [x] Mesaj geçmişi (infinite scroll - older direction)
- [x] Optimistic mesaj gönderme (clientId ile idempotency)
- [x] Okundu bilgisi (read receipts)
- [x] Konuşma arama

### ✅ Servers Modülü
- [x] Secondary sidebar (Liste + Detay modları)
- [x] Sunucu listesi ve arama
- [x] Sunucu oluşturma modali
- [x] Kanal yapısı (text/voice, kategoriler)
- [x] Kanal sohbeti (infinite scroll)
- [x] Üye listesi (rol bazlı, presence)
- [x] Sunucu profil paneli
- [x] Server dropdown menü (placeholder callbacks)

### ✅ Live Modülü
- [x] Stream keşif sayfası
- [x] Kategori filtreleme ve sıralama
- [x] Live chat (infinite scroll)
- [x] Go Live modal (form + ingest bilgileri)
- [x] Stream izleme UI

### ✅ Diğer
- [x] Settings sayfası (local storage persist)
- [x] Notifications sayfası (temel UI)
- [x] Profile sayfası (placeholder)

---

## Ürün Hedefi (MVP)

- Kullanıcı, sabit navigasyon ile Feed / DM / Servers / Live / Notifications / Settings arasında akıcı geçiş yapar
- Tüm modüller çalışır durumda (mock API ile)
- Mock sözleşmesi Go backend ile birebir taşınabilir

---

## Mimari İlkeler

- Feature-based yapı: `src/features/<domain>/...`
- API sözleşmesi tek kaynaktan: `src/api/types.ts`
- Mock ve gerçek backend aynı `ApiClient` üstünden konuşur
- Cursor pagination: feed "ileri", DM/chat "older" mantığı
- Optimistic işlemler `clientId`/idempotency ile güvenli

---

## Milestones

### M0 — Stabilizasyon ✅ TAMAMLANDI

- [x] Build & Tauri build sürekli yeşil
- [x] URL-tabanlı routing (React Router)
- [x] UI edge-case'ler: boş state, error state, loading state

---

### M1 — Servers Refaktör ✅ TAMAMLANDI

- [x] Server listesi ve keşif
- [x] Secondary sidebar (liste/detay modları)
- [x] Kanal yapısı ve sohbet
- [x] Üye listesi ve presence
- [x] Server dropdown menü

---

### M2 — Backend Entegrasyonu (2-3 gün)

Çıktı:
- Go backend projesinin başlatılması
- Core API endpointlerinin implementasyonu
- Auth sistemi (JWT)

İşler:
- [ ] Go project setup (gin/fiber/chi)
- [ ] PostgreSQL database schema
- [ ] `GET /me` + JWT auth
- [ ] `GET/POST /servers` endpointleri
- [ ] `GET/POST /dm/...` endpointleri
- [ ] CORS ve API client konfigürasyonu

---

### M3 — Real-time (2-3 gün)

Çıktı:
- WebSocket gateway
- Gerçek zamanlı mesajlaşma
- Presence sistemi

İşler:
- [ ] WebSocket server setup
- [ ] DM message real-time delivery
- [ ] Server channel message real-time
- [ ] Presence broadcast (online/offline)
- [ ] Typing indicators (opsiyonel)

---

### M4 — Voice & Video (3-5 gün)

Çıktı:
- WebRTC peer connections
- Voice channel functionality
- Camera/screen sharing

İşler:
- [ ] SFU server (mediasoup/janus/livekit)
- [ ] WebRTC signaling
- [ ] Audio streaming
- [ ] Video streaming
- [ ] Screen sharing

---

### M5 — Live Streaming (3-5 gün)

Çıktı:
- RTMP ingest
- HLS/DASH playback
- Real stream functionality

İşler:
- [ ] RTMP media server setup
- [ ] Transcoding pipeline
- [ ] CDN integration
- [ ] Live viewer counts
- [ ] VOD (recorded streams)

---

### M6 — Notifications (1-2 gün)

Çıktı:
- Bildirim sistemi
- Push notifications
- Unread badges

İşler:
- [ ] `GET /notifications` endpoint
- [ ] Notification types (like, repost, mention, follow)
- [ ] Real-time notification delivery
- [ ] Tauri native push notifications
- [ ] Sidebar badge counters

---

### M7 — Media & Attachments (2-3 gün)

Çıktı:
- Image upload/hosting
- Link previews
- File attachments

İşler:
- [ ] Media upload endpoint
- [ ] Image processing (resize, blurhash)
- [ ] S3/MinIO storage
- [ ] Link metadata extraction (OG tags)

---

### M8 — Search & Discovery (1-2 gün)

Çıktı:
- Full-text search
- Server discovery

İşler:
- [ ] PostgreSQL full-text search veya Elasticsearch
- [ ] Server discovery page
- [ ] User search
- [ ] Message search

---

### M9 — Kalite Kapısı (Sürekli)

Çıktı:
- CI/CD pipeline
- Test suite
- Error monitoring

İşler:
- [ ] GitHub Actions CI (lint/typecheck/build)
- [ ] E2E tests (Playwright)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

---

## Teknik Borç ve Riskler

| Risk | Durum | Çözüm |
|------|-------|-------|
| ~~Routing state-based~~ | ✅ Çözüldü | React Router implement edildi |
| Auth henüz yok | ⚠️ Bekliyor | M2'de JWT implementasyonu |
| Real-time yok | ⚠️ Bekliyor | M3'te WebSocket |
| Voice mock | ⚠️ Bekliyor | M4'te WebRTC |
| Live video mock | ⚠️ Bekliyor | M5'te RTMP/HLS |

---

## Öncelik Sırası

1. **M2: Backend Entegrasyonu** — Go backend başlatma, core API'ler
2. **M3: Real-time** — WebSocket gateway
3. **M6: Notifications** — Bildirim sistemi
4. **M4: Voice & Video** — WebRTC
5. **M5: Live Streaming** — RTMP/HLS
6. **M7: Media** — Upload/attachments
7. **M8: Search** — Full-text search
8. **M9: Quality** — CI/CD, tests

---

## Dokümantasyon

- [Platform Specification](./platform-spec.md) — Detaylı API ve veri modelleri
- [Mock API Reference](./mock-api.md) — Mock endpoint sözleşmesi
- Tip tanımları: `src/api/types.ts`
