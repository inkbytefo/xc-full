# Frontend Server Özelliği - Roadmap & Geliştirme Planı

> **Tarih:** 2025-12-27  
> **Versiyon:** 1.0

---

## 📊 Mevcut Yapı Analizi

### Dizin Yapısı

```
src/features/servers/
├── ServersPage.tsx              # Ana sunucu sayfası (706 satır)
├── CreateServerModal.tsx        # Sunucu oluşturma modalı (11KB)
├── CreateChannelModal.tsx       # Kanal oluşturma modalı (10KB)
├── ExploreServersModal.tsx      # Sunucu keşfet modalı (7KB)
├── MembersModal.tsx             # Üye yönetimi modalı (19KB)
├── ServerSettingsModal.tsx      # Sunucu ayarları (16KB)
├── ServerProfilePage.tsx        # Sunucu profil sayfası (15KB)
├── serversApi.ts                # API fonksiyonları (236 satır, 25+ endpoint)
├── serverWallApi.ts             # Duvar paylaşımları API'si (2KB)
├── components/                  # 18 alt bileşen
│   ├── ChatArea.tsx            # Sohbet alanı (21KB)
│   ├── ChannelSidebar.tsx      # Kanal listesi (16KB)
│   ├── MembersPanel.tsx        # Üyeler paneli (13KB)
│   ├── RolesList.tsx           # Rol yönetimi (13KB)
│   ├── BansList.tsx            # Yasaklı kullanıcılar (3KB)
│   ├── ServerHeader.tsx        # Sunucu başlığı (10KB)
│   ├── ServerList.tsx          # Sunucu listesi (4KB)
│   ├── ServerProfileView.tsx   # Profil görünümü (14KB)
│   ├── RoleAssignmentModal.tsx # Rol atama (7KB)
│   ├── DiscoveryDashboard.tsx  # Keşfet paneli (9KB)
│   ├── VideoRoomView.tsx       # Video odası (13KB)
│   ├── VoiceOverlay.tsx        # Ses overlay (6KB)
│   └── ...
└── hooks/
    ├── useServerData.ts         # Ana veri hook'u (275 satır)
    ├── useServerMembers.ts      # Üye verisi hook'u (4KB)
    └── useChannelMessages.ts    # Mesaj hook'u (5KB)

src/features/overlay/widgets/
├── ServerWidget.tsx             # Overlay sunucu widget'ı (144 satır)
└── server/
    ├── ServerRail.tsx           # Sunucu yan çubuğu
    ├── ServerChatArea.tsx       # Sohbet alanı
    └── useServerData.ts         # Overlay veri hook'u
```

### ✅ Tamamlanmış Özellikler

| Özellik | Durum | Dosya(lar) |
|---------|-------|-----------|
| Server CRUD | ✅ Tam | `serversApi.ts`, `CreateServerModal.tsx` |
| Üyelik (Join/Leave) | ✅ Tam | `serversApi.ts` |
| Join Request Yönetimi | ✅ Tam | `MembersModal.tsx` |
| Kanal CRUD | ✅ Tam | `CreateChannelModal.tsx`, `serversApi.ts` |
| Kanal Mesajları | ✅ Tam | `ChatArea.tsx`, `useChannelMessages.ts` |
| RBAC 2.0 Rol Sistemi | ✅ Tam | `RolesList.tsx`, `RoleAssignmentModal.tsx` |
| Ban/Unban | ✅ Tam | `BansList.tsx`, `serversApi.ts` |
| Timeout | ✅ Tam | `MembersModal.tsx`, `serversApi.ts` |
| Server Wall | ✅ Tam | `serverWallApi.ts`, `ServerProfileView.tsx` |
| Voice Channels | ✅ Tam | `VideoRoomView.tsx`, `VoiceOverlay.tsx` |
| Server Settings | ✅ Tam | `ServerSettingsModal.tsx` |
| Overlay Widget | ✅ Tam | `ServerWidget.tsx`, `ServerRail.tsx` |

### API Katmanı Analizi (`serversApi.ts`)

```typescript
// ✅ Tamamlanmış Endpoints (25+)
fetchServers()                    // GET /servers
getServer(id)                     // GET /servers/:id
searchServers(query)              // GET /search/servers
createServer(data)                // POST /servers
updateServer(id, data)            // PATCH /servers/:id
deleteServer(id)                  // DELETE /servers/:id
joinServer(id)                    // POST /servers/:id/join
leaveServer(id)                   // POST /servers/:id/leave
getServerMembers(serverId)        // GET /servers/:id/members
removeMember(serverId, userId)    // DELETE /servers/:id/members/:userId
getServerJoinRequests(serverId)   // GET /servers/:id/join-requests
acceptServerJoinRequest(...)      // POST /servers/:id/join-requests/:userId/accept
rejectServerJoinRequest(...)      // POST /servers/:id/join-requests/:userId/reject
fetchRoles(serverId)              // GET /servers/:id/roles
createRole(...)                   // POST /servers/:id/roles
updateRole(...)                   // PATCH /servers/:id/roles/:roleId
deleteRole(...)                   // DELETE /servers/:id/roles/:roleId
updateMemberRoles(...)            // PUT /servers/:id/members/:userId/roles
banMember(...)                    // POST /servers/:id/bans
unbanMember(...)                  // DELETE /servers/:id/bans/:userId
getBans(...)                      // GET /servers/:id/bans
timeoutMember(...)                // POST /servers/:id/members/:userId/timeout
removeTimeout(...)                // DELETE /servers/:id/members/:userId/timeout
fetchChannels(serverId)           // GET /servers/:id/channels
createChannel(...)                // POST /servers/:id/channels
updateChannel(...)                // PATCH /servers/:id/channels/:channelId
deleteChannel(...)                // DELETE /servers/:id/channels/:channelId
fetchChannelMessages(...)         // GET /servers/:id/channels/:channelId/messages
sendChannelMessage(...)           // POST /servers/:id/channels/:channelId/messages
editChannelMessage(...)           // PATCH /.../messages/:messageId
deleteChannelMessage(...)         // DELETE /.../messages/:messageId
searchChannelMessages(...)        // GET /.../messages/search
ackChannelMessage(...)            // POST /.../ack

// ❌ Eksik Endpoints
// - Invite endpoints YOK
// - Audit log endpoints YOK
// - Permission overwrite endpoints YOK
```

### Type Tanımları (`api/types.ts`)

```typescript
// ✅ Mevcut Types
interface Server { id, name, description, iconGradient, memberCount, ownerId, isPublic, myRole }
interface Channel { id, serverId, name, type, position, parentId }
interface Role { id, name, color, position, permissions, isDefault }
interface ServerMember { id, userId, role, roleIds, joinedAt, user }
interface Ban { id, userId, bannedBy, reason, createdAt }

// ✅ Permission Flags
const Permissions = {
  ADMINISTRATOR: 1 << 0,
  MANAGE_SERVER: 1 << 1,
  MANAGE_ROLES: 1 << 2,
  MANAGE_CHANNELS: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  BAN_MEMBERS: 1 << 5,
  // ... (11 toplam)
}

// ❌ Eksik Types
// - Invite interface YOK
// - AuditLog interface YOK
// - PermissionOverwrite interface YOK
```

---

## ⚠️ Eksik & Yarım Kalan Özellikler

### 🔴 Kritik Eksikler

#### 1. Davet (Invite) Sistemi
**Durum:** TODO olarak işaretlenmiş, implemente EDİLMEMİŞ

```typescript
// ServersPage.tsx:319
// TODO: Implement invite modal

// ServerSettingsModal.tsx:235
// Sadece metin gösterimi var: "Only people with an invite can join"
```

**Eksik Parçalar:**
- `InviteModal.tsx` - Davet oluşturma/paylaşma UI
- Invite API endpoints (`serversApi.ts`)
- Invite type tanımı (`types.ts`)
- Invite link kopyalama/paylaşma

#### 2. Audit Log Görüntüleyici
**Durum:** Frontend'de HİÇ implemente edilmemiş

```typescript
// Backend'de audit log yazılıyor
// Frontend'de görüntülenemiyor - UI yok
```

**Eksik Parçalar:**
- `AuditLogViewer.tsx` component
- Audit log API endpoints
- ServerSettingsModal'a yeni tab

---

### 🟡 Orta Öncelikli Eksikler

#### 3. Kanal Düzenleme Modalı
**Durum:** TODO olarak işaretlenmiş

```typescript
// ServersPage.tsx:341
// TODO: Open edit channel modal

// ServersPage.tsx:355
// TODO: Open edit voice channel modal
```

**Eksik:** `EditChannelModal.tsx`

#### 4. Permission Overwrites UI
**Durum:** Backend'de tablo var, frontend'de kullanılmıyor

```typescript
// Kanal bazlı izin yönetimi UI yok
// Her kanal için rol/üye özel izinleri ayarlanamıyor
```

#### 5. Server Discovery UI İyileştirmesi
**Durum:** Temel var, geliştirilmeli

```typescript
// ExploreServersModal.tsx mevcut
// Eksik: Kategori filtreleme, sıralama, arama geliştirmesi
```

#### 6. Server Icon/Banner Upload
**Durum:** Backend desteklemeli, frontend eksik

```typescript
// Sadece gradient var
// Dosya yükleme UI yok
```

---

### 🟢 Düşük Öncelikli Eksikler

#### 7. Emoji Picker Entegrasyonu
- Kanal mesajlarında emoji picker var
- Server-specific emoji desteği yok

#### 8. Kanal Sıralama (Drag & Drop)
- Kanal listesinde sıralama özelliği yok
- Position güncelleme API mevcut

#### 9. Mesaj Pinleme UI
- Backend destekliyor (`isPinned`)
- Frontend'de pin/unpin UI yok

#### 10. Server Templates
- Sunucu şablonu oluşturma/kullanma yok

---

## 🔧 Kod Kalitesi Gözlemleri

### TODO'lar (3 adet)

```typescript
// ServersPage.tsx:319
// TODO: Implement invite modal

// ServersPage.tsx:341
// TODO: Open edit channel modal

// ServersPage.tsx:355
// TODO: Open edit voice channel modal
```

### Deprecated Type Kullanımı

```typescript
// types.ts:56
export type MemberRole = "owner" | "admin" | "moderator" | "member";
// Bu eski sistem, RBAC 2.0 ile uyumsuz
// Hala Server.myRole'de kullanılıyor
```

### Component Büyüklük Analizi

| Component | Satır | Durum |
|-----------|-------|-------|
| ServersPage.tsx | 706 | ⚠️ Refactor gerekebilir |
| ChatArea.tsx | ~500 | ⚠️ Büyük |
| MembersModal.tsx | 388 | ✅ Kabul edilebilir |
| ServerSettingsModal.tsx | 304 | ✅ İyi |
| useServerData.ts | 275 | ✅ İyi |

### Hook Mimarisi

```typescript
// ✅ İyi pattern: React Query kullanımı
useQuery(['servers'], fetchServers)
useMutation(createServer, { onSuccess: invalidate })

// ⚠️ İyileştirme: Optimistic updates eksik
// ⚠️ İyileştirme: Error boundary entegrasyonu eksik
```

---

## 📋 Geliştirme Roadmap

### Phase 1: Kritik Eksikler (1-2 Hafta)

#### 1.1 Invite Sistemi Frontend

- [ ] `Invite` type tanımla (`types.ts`)
```typescript
interface Invite {
  code: string;
  serverId: string;
  creatorId: string;
  maxUses: number;
  uses: number;
  expiresAt?: string;
  createdAt: string;
}
```

- [ ] API fonksiyonları ekle (`serversApi.ts`)
```typescript
createInvite(serverId, { maxUses, maxAge })
getInvites(serverId)
deleteInvite(code)
useInvite(code) // Join via invite
```

- [ ] `InviteModal.tsx` component
  - Davet oluşturma formu
  - Mevcut davetleri listeleme
  - Link kopyalama butonu
  - QR kod opsiyonu
  - Expiry/max uses ayarları

- [ ] ServersPage entegrasyonu
  - Invite butonu ekleme
  - Context menu'ye invite seçeneği

#### 1.2 Audit Log Viewer

- [ ] `AuditLog` type tanımla
```typescript
interface AuditLog {
  id: string;
  actorId: string;
  targetId: string;
  actionType: AuditLogAction;
  changes: Record<string, unknown>;
  reason?: string;
  createdAt: string;
  actor?: User;
}
```

- [ ] API fonksiyonu ekle
```typescript
getAuditLogs(serverId, { limit, offset, actionType })
```

- [ ] `AuditLogViewer.tsx` component
  - Filtreleme (action type, actor)
  - Pagination
  - Detay görünümü
  - Zaman çizelgesi formatı

- [ ] ServerSettingsModal'a "Audit Log" tab ekle

### Phase 2: Orta Öncelikli (2-3 Hafta)

#### 2.1 Edit Channel Modal

- [ ] `EditChannelModal.tsx` component
  - İsim/açıklama düzenleme
  - Kanal tipi değiştirme
  - Kategori değiştirme
  - Silme onayı

- [ ] ServersPage'deki TODO'ları tamamla

#### 2.2 Permission Overwrites UI

- [ ] `ChannelPermissionsModal.tsx` component
  - Rol bazlı izin override
  - Üye bazlı izin override
  - Allow/Deny matris görünümü

- [ ] API fonksiyonları
```typescript
getChannelPermissions(channelId)
updateChannelPermission(channelId, targetType, targetId, { allow, deny })
```

#### 2.3 Server Media Upload

- [ ] Server icon upload UI
- [ ] Server banner upload UI
- [ ] Crop/resize entegrasyonu
- [ ] Media handler API entegrasyonu

### Phase 3: Kalite İyileştirmeleri (1 Hafta)

#### 3.1 Component Refactoring

- [ ] ServersPage.tsx'i alt component'lara böl
  - `ServerView.tsx`
  - `ChannelView.tsx`
  - `VoiceChannelView.tsx`

- [ ] Optimistic updates ekle
```typescript
useMutation(sendMessage, {
  onMutate: async (newMessage) => {
    // Optimistic update
    queryClient.setQueryData(['messages'], old => [...old, newMessage])
  }
})
```

#### 3.2 Error Handling

- [ ] Error boundary component
- [ ] Toast notifications
- [ ] Retry logic

#### 3.3 Deprecated Kod Temizliği

- [ ] `MemberRole` type'ı kaldır
- [ ] RBAC 2.0 tam geçiş
- [ ] `myRole` -> `roles[]` geçişi

### Phase 4: Gelecek Özellikler (Opsiyonel)

- [ ] Channel drag & drop sıralama
- [ ] Message pinning UI
- [ ] Server templates
- [ ] Server-specific emoji
- [ ] Thread support
- [ ] Scheduled events
- [ ] Server insights/analytics dashboard

---

## 📐 Teknik Spesifikasyonlar

### InviteModal Component Önerisi

```tsx
// features/servers/components/InviteModal.tsx

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
}

export function InviteModal({ isOpen, onClose, serverId, serverName }: InviteModalProps) {
  const [maxUses, setMaxUses] = useState(0);
  const [expiresIn, setExpiresIn] = useState(86400); // 24 hours
  
  const createMutation = useMutation({
    mutationFn: () => createInvite(serverId, { maxUses, maxAge: expiresIn }),
    onSuccess: (invite) => {
      // Copy link to clipboard
      navigator.clipboard.writeText(`https://pink.app/invite/${invite.code}`);
      toast.success('Davet linki kopyalandı!');
    }
  });

  // ... UI implementation
}
```

### AuditLogViewer Component Önerisi

```tsx
// features/servers/components/AuditLogViewer.tsx

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  MEMBER_KICK: { label: 'Üye Atıldı', icon: '👢', color: 'text-orange-400' },
  MEMBER_BAN: { label: 'Üye Yasaklandı', icon: '🔨', color: 'text-red-400' },
  ROLE_CREATE: { label: 'Rol Oluşturuldu', icon: '🎭', color: 'text-green-400' },
  // ...
};

export function AuditLogViewer({ serverId }: { serverId: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', serverId],
    queryFn: () => getAuditLogs(serverId)
  });

  return (
    <div className="space-y-2">
      {logs?.map(log => (
        <AuditLogEntry key={log.id} log={log} />
      ))}
    </div>
  );
}
```

---

## 📊 Öncelik Matrisi

| Özellik | İş Değeri | Zorluk | Öncelik |
|---------|-----------|--------|---------|
| Invite Sistemi | Yüksek | Orta | 🔴 P1 |
| Audit Log Viewer | Orta | Düşük | 🔴 P1 |
| Edit Channel Modal | Orta | Düşük | 🟡 P2 |
| Permission Overwrites UI | Yüksek | Yüksek | 🟡 P2 |
| Server Media Upload | Düşük | Düşük | 🟡 P2 |
| Component Refactoring | Düşük | Orta | 🟢 P3 |
| Optimistic Updates | Orta | Orta | 🟢 P3 |
| Kanal Sıralama | Düşük | Orta | 🟢 P4 |
| Message Pinning | Düşük | Düşük | 🟢 P4 |

---

## 🎯 Sonuç

Frontend server özelliği **oldukça olgun** bir yapıda. API katmanı kapsamlı (25+ endpoint), UI bileşenleri tam fonksiyonel, RBAC 2.0 rol sistemi düzgün entegre edilmiş.

**En kritik eksiklik** backend ile aynı: **Invite (davet) sistemi**. Bu özellik olmadan kullanıcılar özel sunuculara davet linki ile katılamaz.

**İkinci öncelik** audit log viewer olmalı. Backend logları tutuyor, sadece görüntüleme UI'ı eksik.

Frontend ve backend roadmap'leri senkronize çalışmalı:
1. Backend'de invite API → Frontend'de InviteModal
2. Backend'de audit log endpoint → Frontend'de AuditLogViewer

Bu plan 4-6 haftada tamamlanabilir.
