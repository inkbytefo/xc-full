# Server Özelliği - Roadmap & Geliştirme Planı

> **Tarih:** 2025-12-27  
> **Versiyon:** 1.0

---

## 📊 Mevcut Yapı Analizi

### ✅ Tamamlanmış Özellikler

| Özellik | Durum | Dosyalar |
|---------|-------|----------|
| Server CRUD | ✅ Tam | `service.go`, `handlers/server.go` |
| Üyelik Yönetimi | ✅ Tam | Join, Leave, ListMembers, RemoveMember |
| RBAC 2.0 Rol Sistemi | ✅ Tam | 64-bit bitwise permissions, Role hierarchy |
| Ban/Unban | ✅ Tam | `ban_repo.go`, `service.go` |
| Timeout Sistemi | ✅ Tam | `CommunicationDisabledUntil` field |
| Join Request (Özel Sunucu) | ✅ Tam | Pending/Accept/Reject flow |
| Server Wall Posts | ✅ Tam | `server_wall.go`, `wall_post.go` |
| Audit Log | ✅ Tam | `audit_repo.go` - Moderasyon logları |
| Kanal Yönetimi | ✅ Tam | Text, Voice, Category, Announcement |

### Mevcut Mimari

```
internal/
├── domain/server/
│   ├── entity.go          # Server, Role, Member, Ban, AuditLog entities
│   ├── repository.go      # Repository interfaces
│   └── wall_post.go       # WallPost entity
├── application/server/
│   ├── service.go         # Business logic (1015 satır)
│   └── service_test.go    # Unit tests
├── adapters/http/handlers/
│   ├── server.go          # Server HTTP handlers (657 satır)
│   └── server_wall.go     # Wall post handlers
└── infrastructure/postgres/
    ├── server_repo.go     # Server, Member, Role repos (840 satır)
    ├── ban_repo.go        # Ban repository
    └── audit_repo.go      # Audit log repository
```

### Permission Sistemi (RBAC 2.0)

```go
// Mevcut 64-bit permission flags
PermissionAdministrator   = 1 << 0   // Tüm yetkileri bypass
PermissionManageServer    = 1 << 1   // Sunucu ayarları
PermissionManageRoles     = 1 << 2   // Rol yönetimi
PermissionManageChannels  = 1 << 3   // Kanal yönetimi
PermissionKickMembers     = 1 << 4   // Kick
PermissionBanMembers      = 1 << 5   // Ban
PermissionInviteMembers   = 1 << 6   // Davet oluşturma (KULLANILMIYOR)
PermissionViewChannel     = 1 << 10  // Kanal görme
PermissionSendMessages    = 1 << 11  // Mesaj gönderme
PermissionManageMessages  = 1 << 12  // Mesaj yönetimi
// ... voice permissions (20-25)
```

---

## ⚠️ Eksik & Yarım Kalan Özellikler

### 🔴 Kritik Eksikler

#### 1. Davet (Invite) Sistemi
**Durum:** Tanımlanmış ama implemente EDİLMEMİŞ

```go
// entity.go - Sadece permission ve audit action tanımlı
PermissionInviteMembers = 1 << 6
AuditLogActionInviteCreate = "INVITE_CREATE"
AuditLogActionInviteDelete = "INVITE_DELETE"

// Eksik olanlar:
// - Invite entity
// - InviteRepository
// - Invite handler/service
// - Migration
```

**Gerekli Yapı:**
```go
type Invite struct {
    Code      string
    ServerID  string
    CreatorID string
    MaxUses   int
    Uses      int
    ExpiresAt *time.Time
    CreatedAt time.Time
}
```

#### 2. Audit Log Endpoint'i
**Durum:** Loglar yazılıyor ama OKUNAMİYOR

```go
// Mevcut: AuditLogRepository.Create() kullanılıyor
// Eksik: GET /servers/:id/audit-logs endpoint YOK
```

---

### 🟡 Orta Öncelikli Eksikler

#### 3. Permission Overwrites
**Durum:** Migration var, kullanılmıyor

```sql
-- 000002_init_servers.up.sql
CREATE TABLE permission_overwrites (
    channel_id  VARCHAR(26) NOT NULL,
    target_type VARCHAR(10) NOT NULL, -- 'role' or 'member'
    target_id   VARCHAR(26) NOT NULL,
    allow       BIGINT NOT NULL DEFAULT 0,
    deny        BIGINT NOT NULL DEFAULT 0,
);
```
**Sorun:** Bu tablo backend'de hiç kullanılmıyor. Channel-level permissions yok.

#### 4. Server Discovery
**Durum:** Public sunucular listelenemez

```go
// Mevcut: FindByUserID - sadece üye olunan sunucular
// Eksik: FindPublicServers - keşfet özelliği
```

#### 5. Server Icon/Banner
**Durum:** Sadece gradient var

```go
type Server struct {
    IconGradient [2]string  // ✅ Var
    // IconURL   string     // ❌ Yok
    // BannerURL string     // ❌ Yok
}
```

#### 6. Vanity URL
**Durum:** Yok

```go
// Sunuculara özel URL desteği yok
// Örn: pink.app/servers/my-server yerine sadece UUID kullanılıyor
```

---

### 🟢 Düşük Öncelikli Eksikler

#### 7. Emoji/Sticker Sistemi
- Entity yok
- Migration yok
- Tamamen eksik

#### 8. Server Templates
- Sunucu şablonları
- Klonlama özelliği

#### 9. Server Boost
- Premium özellikler
- Boost seviyeleri

---

## 🔧 Kod Kalitesi Sorunları

### 1. Deprecated Kod

```go
// entity.go:159-168 - Hala mevcut
type MemberRole string // Deprecated olarak işaretli ama silinmemiş
const (
    RoleOwner     MemberRole = "owner"
    RoleAdmin     MemberRole = "admin"
    RoleModerator MemberRole = "moderator"
    RoleMember    MemberRole = "member"
)
```

### 2. Test Coverage

```
- service_test.go: 414 satır, 7 test
- Sadece Join/Leave/AcceptJoinRequest testleri var
- Eksik testler:
  - BanMember
  - TimeoutMember  
  - Role CRUD
  - Permission checks
```

### 3. TODO'lar

```go
// privacy/service.go:165
_ = followStatus // TODO: expose in response if needed

// privacy/service.go:165
// TODO: Check if they share a server

// privacy/service.go:215
// TODO: Implement friends of friends check
```

---

## 📋 Geliştirme Roadmap

### Phase 1: Kritik Eksikler (1-2 Hafta)

#### 1.1 Invite Sistemi
- [ ] `Invite` entity oluştur (`domain/server/invite.go`)
- [ ] `InviteRepository` interface tanımla
- [ ] PostgreSQL migration ekle (`000016_invites.up.sql`)
- [ ] `postgres.InviteRepository` implemente et
- [ ] `InviteService` business logic ekle
- [ ] HTTP handlers (`handlers/invite.go`)
  - `POST /servers/:id/invites` - Davet oluştur
  - `GET /servers/:id/invites` - Davetleri listele
  - `DELETE /servers/:id/invites/:code` - Davet sil
  - `POST /invites/:code` - Daveti kullan (join)
- [ ] Unit tests

#### 1.2 Audit Log Endpoint
- [ ] `AuditLogHandler` oluştur
- [ ] `GET /servers/:id/audit-logs` endpoint
  - Query params: `limit`, `offset`, `action_type`, `actor_id`
- [ ] Pagination desteği
- [ ] Filter desteği

### Phase 2: Orta Öncelikli (2-3 Hafta)

#### 2.1 Permission Overwrites
- [ ] `PermissionOverwrite` entity
- [ ] `PermissionOverwriteRepository` interface
- [ ] `postgres.PermissionOverwriteRepository` implemente et
- [ ] Channel service'e overwrite kontrolleri ekle
- [ ] `hasChannelPermission(userID, channelID, permission)` fonksiyonu

#### 2.2 Server Discovery
- [ ] `Repository.FindPublicServers(limit, offset, sortBy)` method
- [ ] `GET /servers/discover` endpoint
- [ ] Kategori sistemi (gaming, community, education, vb.)
- [ ] Arama özelliği

#### 2.3 Server Media
- [ ] Server entity'ye `IconURL`, `BannerURL` ekle
- [ ] Migration güncelle
- [ ] `PATCH /servers/:id` - icon/banner upload
- [ ] Media handler entegrasyonu

### Phase 3: Kalite İyileştirmeleri (1 Hafta)

#### 3.1 Deprecated Kod Temizliği
- [ ] `MemberRole` tipini tamamen kaldır
- [ ] Tüm referansları RBAC 2.0'a geçir

#### 3.2 Test Coverage
- [ ] Ban/Unban testleri
- [ ] Timeout testleri
- [ ] Role CRUD testleri
- [ ] Permission check testleri
- [ ] Integration tests

#### 3.3 TODO Temizliği
- [ ] privacy/service.go TODO'larını implemente et

### Phase 4: Gelecek Özellikler (Opsiyonel)

- [ ] Vanity URL sistemi
- [ ] Emoji/Sticker sistemi
- [ ] Server Templates
- [ ] Server Boost
- [ ] Scheduled Events
- [ ] Server Insights/Analytics

---

## 📐 Teknik Spesifikasyonlar

### Invite Entity Önerisi

```go
// domain/server/invite.go
package server

import "time"

type Invite struct {
    Code        string     // Benzersiz davet kodu (8 karakter)
    ServerID    string
    ChannelID   string     // Opsiyonel, belirli kanala davet
    CreatorID   string
    MaxUses     int        // 0 = sınırsız
    Uses        int
    MaxAge      int        // Saniye, 0 = süresiz
    ExpiresAt   *time.Time
    IsTemporary bool       // Geçici üyelik
    CreatedAt   time.Time
}

type InviteRepository interface {
    Create(ctx context.Context, invite *Invite) error
    FindByCode(ctx context.Context, code string) (*Invite, error)
    FindByServerID(ctx context.Context, serverID string) ([]*Invite, error)
    Delete(ctx context.Context, code string) error
    IncrementUses(ctx context.Context, code string) error
}
```

### Migration Önerisi

```sql
-- 000016_invites.up.sql
CREATE TABLE server_invites (
    code        VARCHAR(10) PRIMARY KEY,
    server_id   VARCHAR(26) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    channel_id  VARCHAR(26) REFERENCES channels(id) ON DELETE SET NULL,
    creator_id  VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_uses    INTEGER NOT NULL DEFAULT 0,
    uses        INTEGER NOT NULL DEFAULT 0,
    max_age     INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ,
    is_temporary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_server_id ON server_invites(server_id);
CREATE INDEX idx_invites_expires_at ON server_invites(expires_at) WHERE expires_at IS NOT NULL;
```

---

## 📊 Öncelik Matrisi

| Özellik | İş Değeri | Zorluk | Öncelik |
|---------|-----------|--------|---------|
| Invite Sistemi | Yüksek | Orta | 🔴 P1 |
| Audit Log Endpoint | Orta | Düşük | 🔴 P1 |
| Permission Overwrites | Yüksek | Yüksek | 🟡 P2 |
| Server Discovery | Orta | Düşük | 🟡 P2 |
| Server Media | Düşük | Düşük | 🟡 P2 |
| Deprecated Kod Temizliği | Düşük | Düşük | 🟢 P3 |
| Test Coverage | Orta | Orta | 🟢 P3 |
| Vanity URL | Düşük | Orta | 🟢 P4 |
| Emoji/Sticker | Düşük | Yüksek | 🟢 P4 |

---

## 🎯 Sonuç

Mevcut Server yapısı **sağlam bir temel** üzerine kurulmuş. RBAC 2.0 permission sistemi, audit logging ve moderasyon özellikleri iyi implemente edilmiş.

**En kritik eksiklik** davet (invite) sistemidir. Kullanıcıların sunuculara nasıl katılacağı şu an sadece public/private join ile sınırlı. Davet linki desteği mutlaka eklenmeli.

**İkinci öncelik** audit log endpoint'i olmalı. Veriler zaten yazılıyor, sadece okuma endpoint'i eksik.

Bu roadmap'i takip ederek 4-6 hafta içinde tam kapsamlı bir Server sistemi elde edilebilir.
