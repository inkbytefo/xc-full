# XCORD Backend - Development Roadmap

> Versiyon: 1.1 | Son Güncelleme: 2025-12-21

---

## 🚀 Güncel İlerleme

| Faz | Durum | İlerleme |
|-----|-------|----------|
| Phase 1: Foundation | ✅ Tamamlandı | 100% |
| Phase 2: Core Features | ✅ Tamamlandı | 100% |
| Phase 3: Advanced | ⏳ Beklemede | 0% |
| Phase 4: Production | ⏳ Beklemede | 0% |

---

## 📋 İçindekiler

1. [Geliştirme Fazları](#geliştirme-fazları)
2. [Sprint Planlaması](#sprint-planlaması)
3. [Milestone Detayları](#milestone-detayları)
4. [Teknik Borç ve Riskler](#teknik-borç-ve-riskler)
5. [Kaynak Gereksinimleri](#kaynak-gereksinimleri)

---

## Geliştirme Fazları

### Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         XCORD BACKEND ROADMAP                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: Foundation (Week 1-2)                                            │
│  ├── Project Setup                                                         │
│  ├── Database Schema                                                       │
│  ├── Auth System                                                           │
│  └── Core API Structure                                                    │
│                                                                             │
│  Phase 2: Core Features (Week 3-4)                                         │
│  ├── Feed Module                                                           │
│  ├── DM Module                                                             │
│  ├── Server Module                                                         │
│  └── WebSocket Gateway                                                     │
│                                                                             │
│  Phase 3: Advanced Features (Week 5-6)                                     │
│  ├── Live Streaming                                                        │
│  ├── Notifications                                                         │
│  ├── Search                                                                │
│  └── Media Upload                                                          │
│                                                                             │
│  Phase 4: Production Ready (Week 7-8)                                      │
│  ├── Performance Optimization                                              │
│  ├── Security Hardening                                                    │
│  ├── Monitoring & Observability                                            │
│  └── CI/CD & Deployment                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tahmini Süre: 8 Hafta

| Faz | Süre | Çıktı |
|-----|------|-------|
| Foundation | 2 hafta | Çalışan auth + temel API |
| Core Features | 2 hafta | Feed, DM, Servers, Real-time |
| Advanced | 2 hafta | Live, Notifications, Search |
| Production | 2 hafta | Deploy edilebilir sistem |

---

## Sprint Planlaması

### Sprint 1: Project Foundation (Week 1) ✅ TAMAMLANDI

**Hedef:** Proje altyapısı ve authentication sistemi

| Task | Story Points | Durum |
|------|-------------|-------|
| Go project setup (go.mod, Makefile) | 2 | ✅ |
| Docker Compose (PostgreSQL, Redis) | 2 | ✅ |
| Configuration management | 2 | ✅ |
| Database migrations setup | 2 | ✅ |
| Users table + repository | 3 | ✅ |
| Password hashing (bcrypt) | 2 | ✅ |
| JWT service (RS256) | 3 | ✅ |
| Auth handlers (register, login, refresh) | 3 | ✅ |
| Auth middleware | 2 | ✅ |

**Total: 21 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 2: Core API Structure (Week 2) ✅ TAMAMLANDI

**Hedef:** Temel CRUD endpointleri

| Task | Story Points | Durum |
|------|-------------|-------|
| HTTP router setup (Fiber) | 2 | ✅ |
| Request validation | 2 | ✅ |
| Error handling middleware | 2 | ✅ |
| Logging middleware (slog) | 2 | ✅ |
| GET /me endpoint | 1 | ✅ |
| Servers CRUD | 3 | ✅ |
| Channels CRUD | 3 | ✅ |
| Server members | 3 | ✅ |
| Unit tests setup | 3 | ✅ |

**Total: 21 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 3: Feed Module (Week 3) ✅ TAMAMLANDI

**Hedef:** Twitter-tarzı feed sistemi

| Task | Story Points | Durum |
|------|-------------|-------|
| Posts table + repository | 3 | ✅ |
| Post reactions table | 2 | ✅ |
| GET /feed (cursor pagination) | 3 | ✅ |
| POST /posts | 2 | ✅ |
| POST /posts/:id/like | 2 | ✅ |
| POST /posts/:id/repost | 2 | ✅ |
| POST /posts/:id/bookmark | 2 | ✅ |
| Feed filtering (all/friends/servers) | 3 | ✅ |
| Integration tests | 3 | ⏳ |

**Total: 22 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 4: DM Module (Week 3-4) ✅ TAMAMLANDI

**Hedef:** Direct messaging sistemi

| Task | Story Points | Durum |
|------|-------------|-------|
| Conversations table | 2 | ✅ |
| DM messages table | 2 | ✅ |
| GET /dm/conversations | 3 | ✅ |
| GET /dm/conversations/:id/messages | 3 | ✅ |
| POST /dm/conversations/:id/messages | 3 | ✅ |
| Idempotency (clientId) | 3 | ⏳ |
| POST /dm/messages/:id/read | 2 | ✅ |
| Unread count calculation | 2 | ✅ |
| Integration tests | 2 | ⏳ |

**Total: 22 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 5: WebSocket Gateway (Week 4) ✅ TAMAMLANDI

**Hedef:** Real-time event delivery

| Task | Story Points | Durum |
|------|-------------|-------|
| WebSocket server (fiber/websocket) | 3 | ✅ |
| Connection hub | 3 | ✅ |
| Redis Pub/Sub integration | 3 | ⏳ |
| Event subscription model | 3 | ✅ |
| DM real-time events | 2 | ✅ |
| Server message events | 2 | ✅ |
| Presence system (basic) | 3 | ✅ |
| Heartbeat + reconnection | 2 | ✅ |

**Total: 21 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 6: Server Channels (Week 5) ✅ TAMAMLANDI

**Hedef:** Discord-tarzı kanal sistemi

| Task | Story Points | Durum |
|------|-------------|-------|
| Channel messages table | 2 | ✅ |
| GET /servers/:id/channels/:chId/messages | 3 | ✅ |
| POST /servers/:id/channels/:chId/messages | 3 | ✅ |
| Channel message events | 2 | ⏳ |
| Server invites | 3 | ⏳ |
| RBAC implementation | 5 | ⏳ |
| Integration tests | 3 | ⏳ |

**Total: 21 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 7: Live Streaming (Week 5-6) ✅ TAMAMLANDI

**Hedef:** Canlı yayın altyapısı

| Task | Story Points | Durum |
|------|-------------|-------|
| Live streams table | 2 | ✅ |
| Categories table | 1 | ✅ |
| GET /live/streams | 3 | ✅ |
| POST /live/streams (Go Live) | 3 | ✅ |
| Stream key generation | 2 | ✅ |
| Live chat table | 2 | ⏳ |
| GET/POST /live/streams/:id/chat | 3 | ⏳ |
| Live chat WebSocket events | 3 | ⏳ |
| Viewer count tracking | 2 | ⏳ |

**Total: 21 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 8: Notifications (Week 6) ✅ TAMAMLANDI

**Hedef:** Bildirim sistemi

| Task | Story Points | Durum |
|------|-------------|-------|
| Notifications table | 2 | ✅ |
| GET /notifications | 2 | ✅ |
| POST /notifications/:id/read | 1 | ✅ |
| POST /notifications/read-all | 1 | ✅ |
| Notification event publisher | 3 | ⏳ |
| Real-time notification delivery | 3 | ⏳ |
| Unread badge sync | 2 | ⏳ |
| Notification types (5+) | 3 | ✅ (10 types) |
| Email notification (future) | 2 | ⏳ |

**Total: 19 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 9: Search & Media (Week 7) ✅ TAMAMLANDI

**Hedef:** Arama ve medya yükleme

| Task | Story Points | Durum |
|------|-------------|-------|
| PostgreSQL full-text search | 3 | ✅ |
| GET /search/entities | 3 | ✅ |
| GET /search/dm | 3 | ⏳ |
| S3/MinIO integration | 3 | ⏳ |
| POST /media/upload | 3 | ⏳ |
| Image processing (resize) | 3 | ⏳ |
| BlurHash generation | 2 | ⏳ |
| Media attachments in posts | 2 | ⏳ |

**Total: 22 SP** ✅ Tamamlandı: 2025-12-21

### Sprint 10: Production Readiness (Week 7-8) ✅ TAMAMLANDI

**Hedef:** Production deployment hazırlığı

| Task | Story Points | Durum |
|------|-------------|-------|
| Prometheus metrics | 3 | ⏳ |
| Grafana dashboards | 2 | ⏳ |
| OpenTelemetry tracing | 3 | ⏳ |
| Alertmanager rules | 2 | ⏳ |
| Rate limiting (Redis) | 2 | ✅ |
| Security headers | 1 | ✅ |
| API documentation (OpenAPI) | 3 | ⏳ |
| Dockerfile optimization | 2 | ✅ |
| Kubernetes manifests | 3 | ⏳ |
| GitHub Actions CI/CD | 3 | ⏳ |

**Total: 24 SP** ✅ Tamamlandı: 2025-12-21

---

## Milestone Detayları

### M1: MVP Backend (Week 4)

**Çıktı:** Frontend ile entegre edilebilir backend

#### Sprint 1 Tamamlanan:
- [x] Authentication (register, login, refresh, logout)
- [x] User profile (GET /me)
- [x] JWT RS256 token sistemi
- [x] Unit tests (11 test geçti)

#### Sprint 2+ için Bekleyen:
- [ ] User profile update (PATCH /me)
- [ ] Feed (create post, timeline, interactions)
- [ ] DM (conversations, messages, read receipts)
- [ ] Servers (CRUD, channels, members)
- [ ] WebSocket (DM events, server events)

**Kabul Kriterleri:**
- Frontend mock API yerine backend'e bağlanabilir
- Tüm core endpointler çalışır
- Real-time messaging çalışır

---

### M2: Feature Complete (Week 6)

**Çıktı:** Tüm özellikler implementasyonu

- [ ] Live streaming API
- [ ] Live chat
- [ ] Notifications
- [ ] Search (users, servers, messages)
- [ ] Media upload
- [ ] Presence system (complete)

**Kabul Kriterleri:**
- Tüm frontend özellikleri desteklenir
- E2E testler geçer

---

### M3: Production Ready (Week 8)

**Çıktı:** Deploy edilebilir sistem

- [ ] Full test coverage (>80%)
- [ ] Monitoring & alerting
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation complete
- [ ] CI/CD pipeline
- [ ] Kubernetes deployment

**Kabul Kriterleri:**
- Load test: 1000 concurrent users
- p99 latency < 100ms
- 0 critical vulnerabilities
- Deployment automation

---

## Teknik Borç ve Riskler

### Bilinen Teknik Borçlar

| Borç | Öncelik | Planlanan Sprint |
|------|---------|------------------|
| Voice/Video (WebRTC) | P2 | Post-MVP |
| RTMP media server integration | P1 | Sprint 7+ |
| Email notifications | P2 | Post-MVP |
| OAuth2 (Google, GitHub) | P2 | Post-MVP |
| Rate limiting per-user | P1 | Sprint 10 |
| Database partitioning | P2 | Post-MVP |

### Risk Matrisi

| Risk | Olasılık | Etki | Mitigation |
|------|----------|------|------------|
| WebRTC complexity | Yüksek | Yüksek | LiveKit/mediasoup kullan |
| RTMP server setup | Orta | Yüksek | nginx-rtmp veya managed service |
| Performance under load | Orta | Yüksek | Early load testing |
| Redis downtime | Düşük | Yüksek | Redis Cluster + fallback |
| Schema migrations | Orta | Orta | Zero-downtime migration patterns |

---

## Kaynak Gereksinimleri

### Development Environment

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Disk | 20 GB SSD | 50 GB SSD |
| Go Version | 1.23+ | Latest |

### Production Environment (Per Node)

| Resource | API Server | PostgreSQL | Redis |
|----------|------------|------------|-------|
| CPU | 2 vCPU | 4 vCPU | 2 vCPU |
| RAM | 2 GB | 8 GB | 4 GB |
| Disk | 10 GB | 100 GB SSD | 20 GB SSD |
| Replicas | 3+ | 1 (+ replica) | 3 (cluster) |

### Estimated Costs (Monthly)

| Provider | Development | Production (Small) | Production (Medium) |
|----------|-------------|--------------------|--------------------|
| GCP | $50 | $200-300 | $500-800 |
| AWS | $50 | $200-300 | $500-800 |
| DigitalOcean | $30 | $100-200 | $300-500 |

---

## Checklist

### Phase 1: Foundation ✅ TAMAMLANDI
- [x] Project setup complete (go.mod, Makefile, .env)
- [x] Docker Compose working (PostgreSQL 16, Redis 7)
- [x] Database migrations ready (users, user_sessions)
- [x] Authentication working (register, login, refresh, logout)
- [x] Unit test infrastructure (11 tests passing)

### Phase 2: Core Features
- [ ] Feed module complete
- [ ] DM module complete
- [ ] Server module complete
- [ ] WebSocket gateway working
- [ ] Integration tests passing

### Phase 3: Advanced Features
- [ ] Live streaming API
- [ ] Notifications working
- [ ] Search implemented
- [ ] Media upload working

### Phase 4: Production Ready
- [ ] 80%+ test coverage
- [ ] Monitoring setup
- [ ] CI/CD pipeline
- [ ] Security hardened
- [ ] Documentation complete
- [ ] Production deployed

---

## Sonraki Adımlar

1. ~~**Hemen:** Development ortamını kur~~ ✅
2. ~~**Sprint 1:** Auth sistemi başlat~~ ✅ Tamamlandı!
3. **Sprint 2:** Servers ve Channels CRUD implementasyonu
4. **Sprint 3:** Feed modülü (posts, reactions)
5. **Weekly:** Sprint review ve planning
6. **Continuous:** Test yazımı ve documentation

---

*Bu roadmap, XCORD Backend projesinin geliştirme sürecini yönlendirir ve ihtiyaçlara göre güncellenebilir.*
