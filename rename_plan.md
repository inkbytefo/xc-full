# 🎀 XCord → Pink Rebrand Plan

Bu döküman, uygulamanın **"xcord"** isminden **"pink"** ismine geçirilmesi için yapılması gereken tüm değişiklikleri kapsamlı bir şekilde belgelemektedir.

> [!IMPORTANT]
> Bu değişiklik tüm frontend ve backend bileşenlerini etkilemektedir. Değişiklikler doğru sırayla yapılmalıdır.

---

## 📋 Özet

| Kategori | Etkilenen Dosya Sayısı |
|----------|------------------------|
| Frontend (Tauri/React) | ~15 dosya |
| Backend (Go) | ~60+ dosya |
| Configuration | ~10 dosya |
| Docker/DevOps | ~5 dosya |

---

## 🖥️ Frontend Değişiklikleri

### Tauri Configuration

#### [MODIFY] `frontdesktop/src-tauri/tauri.conf.json`

```diff
-  "productName": "xcord",
+  "productName": "pink",

-  "identifier": "com.oxis.xcord",
+  "identifier": "com.oxis.pink",

-        "title": "XC",
+        "title": "Pink",

-        "title": "XC Overlay",
+        "title": "Pink Overlay",
```

---

#### [MODIFY] `frontdesktop/src-tauri/Cargo.toml`

```diff
[package]
-name = "xcord"
+name = "pink"

[lib]
-name = "xcord_lib"
+name = "pink_lib"
```

---

#### [MODIFY] `frontdesktop/src-tauri/src/main.rs`

```diff
fn main() {
-    xcord_lib::run()
+    pink_lib::run()
}
```

---

### NPM Package Configuration

#### [MODIFY] `frontdesktop/package.json`

```diff
{
-  "name": "xcord",
+  "name": "pink",
```

---

#### [MODIFY] `frontdesktop/package-lock.json`

```diff
-  "name": "xcord",
+  "name": "pink",
```

> [!TIP]
> `package-lock.json` dosyası `npm install` komutuyla otomatik olarak güncellenecektir. Manuel değişikliğe gerek yoktur.

---

### HTML Dosyaları

#### [MODIFY] `frontdesktop/index.html`

```diff
-    <title>Tauri + React + Typescript</title>
+    <title>Pink</title>
```

---

#### [MODIFY] `frontdesktop/overlay.html`

```diff
-    <title>XC Overlay</title>
+    <title>Pink Overlay</title>
```

---

### React Store Dosyaları

#### [MODIFY] `frontdesktop/src/store/authStore.ts`

```diff
-// XCORD Auth Store - Professional Token Management
+// Pink Auth Store - Professional Token Management

-            name: "xcord-auth",
+            name: "pink-auth",
```

---

#### [MODIFY] `frontdesktop/src/store/uiStore.ts`

```diff
-            name: "xcord-ui",
+            name: "pink-ui",
```

---

#### [MODIFY] `frontdesktop/src/store/voiceStore.ts`

```diff
-const VOICE_BUS_NAME = "xc-voice-bus-v1";
+const VOICE_BUS_NAME = "pink-voice-bus-v1";
```

---

### Overlay Store Dosyaları

#### [MODIFY] `frontdesktop/src/features/overlay/stores/widgetStore.ts`

```diff
-            name: 'xc-widget-layout',
+            name: 'pink-widget-layout',
```

---

#### [MODIFY] `frontdesktop/src/features/overlay/stores/overlaySettingsStore.ts`

```diff
-            name: 'xc-overlay-settings',
+            name: 'pink-overlay-settings',
```

---

### UI Bileşenleri

#### [MODIFY] `frontdesktop/src/features/settings/SettingsPage.tsx`

```diff
-                <h3 className="text-2xl font-bold text-white">XCORD</h3>
+                <h3 className="text-2xl font-bold text-white">Pink</h3>

-                <p>© 2024 XCORD. Tüm hakları saklıdır.</p>
+                <p>© 2024 Pink. Tüm hakları saklıdır.</p>
```

---

#### [MODIFY] `frontdesktop/src/components/MainSidebar.tsx`

```diff
-              <div className="text-sm font-semibold tracking-wide text-white">XC</div>
+              <div className="text-sm font-semibold tracking-wide text-white">Pink</div>
```

---

#### [MODIFY] `frontdesktop/src/features/overlay/layout/ActionBar.tsx`

```diff
-                            <span className="text-[11px] font-black text-white leading-none tracking-tight">XC</span>
+                            <span className="text-[11px] font-black text-white leading-none tracking-tight">Pink</span>
```

---

### API ve Overlay Hooks

#### [MODIFY] `frontdesktop/src/api/types.ts`

```diff
-// XCORD API Types - Backend DTO Compatible (Minimal)
+// Pink API Types - Backend DTO Compatible (Minimal)
```

---

#### [MODIFY] `frontdesktop/src/api/client.ts`

```diff
-// XCORD API Client - With Auth Token Management
+// Pink API Client - With Auth Token Management
```

---

#### [MODIFY] `frontdesktop/src/features/overlay/hooks/useOverlayMode.ts`

```diff
-        if (typeof window.__XC_PINNED_VIEW !== 'undefined') {
+        if (typeof window.__PINK_PINNED_VIEW !== 'undefined') {

-            setPinnedView(window.__XC_PINNED_VIEW === true);
+            setPinnedView(window.__PINK_PINNED_VIEW === true);

-            setPinnedView(window.__XC_PINNED_VIEW === true);
+            setPinnedView(window.__PINK_PINNED_VIEW === true);
```

---

#### [MODIFY] `frontdesktop/src/features/overlay/styles/overlay.css`

```diff
-   XC Overlay Styles - Modern Refactor
+   Pink Overlay Styles - Modern Refactor
```

---

#### [MODIFY] `frontdesktop/src-tauri/src/lib.rs`

```diff
-// XC Overlay - Rust Backend
+// Pink Overlay - Rust Backend
```

---

## ⚙️ Backend Değişiklikleri (Go)

### Module ve Configuration

#### [MODIFY] `Backend/go.mod`

```diff
-module xcord
+module pink
```

> [!CAUTION]
> Bu değişiklik **TÜM GO IMPORT PATH'lerini** etkileyecektir. Aşağıdaki dosyalarda bulunan `"xcord/..."` importları `"pink/..."` olarak değiştirilmelidir.

---

#### [MODIFY] `Backend/internal/config/config.go`

```diff
-			URL:             getEnv("DATABASE_URL", "postgres://xcord:xcord@localhost:5432/xcord?sslmode=disable"),
+			URL:             getEnv("DATABASE_URL", "postgres://pink:pink@localhost:5432/pink?sslmode=disable"),
```

---

#### [MODIFY] `Backend/internal/infrastructure/auth/jwt.go`

```diff
-		issuer:               "xcord-auth",
+		issuer:               "pink-auth",

-		audience:             "xcord-api",
+		audience:             "pink-api",
```

---

### Import Path Değişiklikleri (60+ dosya)

Aşağıdaki dosyalardaki TÜM `"xcord/..."` import path'leri `"pink/..."` olarak değiştirilmelidir:

**Infrastructure Layer**
- `internal/infrastructure/ws/hub.go`
- `internal/infrastructure/postgres/wall_post_repo.go`
- `internal/infrastructure/postgres/voice_participant_repo.go`
- `internal/infrastructure/postgres/voice_channel_repo.go`
- `internal/infrastructure/postgres/user_repo.go`
- `internal/infrastructure/postgres/stream_repo.go`
- `internal/infrastructure/postgres/session_repo.go`
- `internal/infrastructure/postgres/server_repo.go`
- `internal/infrastructure/postgres/search_repo.go`
- `internal/infrastructure/postgres/read_state_repository.go`
- `internal/infrastructure/postgres/reaction_repo.go`
- `internal/infrastructure/postgres/privacy_repo.go`
- `internal/infrastructure/postgres/post_repo.go`
- `internal/infrastructure/postgres/notification_repo.go`
- `internal/infrastructure/postgres/media_repo.go`
- `internal/infrastructure/postgres/follow_repo.go`
- `internal/infrastructure/postgres/dm_message_repo.go`
- `internal/infrastructure/postgres/conversation_repo.go`
- `internal/infrastructure/postgres/connection.go`
- `internal/infrastructure/postgres/channel_repo.go`
- `internal/infrastructure/postgres/channel_message_repo.go`
- `internal/infrastructure/postgres/category_repo.go`
- `internal/infrastructure/cache/user_repository.go`
- `internal/infrastructure/auth/password_test.go`
- `internal/infrastructure/auth/password.go`
- `internal/infrastructure/auth/jwt_test.go`
- `internal/infrastructure/auth/jwt.go`

**Application Layer**
- `internal/application/user/service.go`
- `internal/application/server/service.go`
- `internal/application/privacy/service.go`
- `internal/application/permission/engine.go`
- `internal/application/feed/service.go`
- `internal/application/dm/service.go`
- `internal/application/channel/service.go`

**Adapters Layer**
- `internal/adapters/http/router/router.go`
- `internal/adapters/http/middleware/auth.go`
- `internal/adapters/http/handlers/websocket.go`
- `internal/adapters/http/handlers/webhook.go`
- `internal/adapters/http/handlers/voice.go`
- `internal/adapters/http/handlers/user.go`
- `internal/adapters/http/handlers/server_wall.go`
- `internal/adapters/http/handlers/server.go`
- `internal/adapters/http/handlers/search.go`
- `internal/adapters/http/handlers/privacy.go`
- `internal/adapters/http/handlers/notification.go`
- `internal/adapters/http/handlers/media.go`
- `internal/adapters/http/handlers/live.go`
- `internal/adapters/http/handlers/health.go`
- `internal/adapters/http/handlers/follow.go`
- `internal/adapters/http/handlers/feed.go`
- `internal/adapters/http/handlers/dm.go`
- `internal/adapters/http/handlers/channel.go`
- `internal/adapters/http/handlers/auth.go`

**Domain Layer**
- `internal/domain/channel/entity.go`
- Ve diğer domain dosyaları...

---

### Build ve DevOps Dosyaları

#### [MODIFY] `Backend/Makefile`

```diff
-BINARY_NAME=xcord-api
+BINARY_NAME=pink-api

-DATABASE_URL ?= postgres://xcord:xcord@localhost:5432/xcord?sslmode=disable
+DATABASE_URL ?= postgres://pink:pink@localhost:5432/pink?sslmode=disable

-	docker build -t xcord-api:latest -f deployments/docker/Dockerfile .
+	docker build -t pink-api:latest -f deployments/docker/Dockerfile .

-	@echo "XCORD Backend Makefile Commands:"
+	@echo "Pink Backend Makefile Commands:"
```

---

#### [MODIFY] `Backend/docker-compose.yml`

```diff
-    container_name: xcord-postgres
+    container_name: pink-postgres

-      POSTGRES_USER: xcord
+      POSTGRES_USER: pink

-      POSTGRES_PASSWORD: xcord
+      POSTGRES_PASSWORD: pink

-      POSTGRES_DB: xcord
+      POSTGRES_DB: pink

-      test: [ "CMD-SHELL", "pg_isready -U xcord -d xcord" ]
+      test: [ "CMD-SHELL", "pg_isready -U pink -d pink" ]

-    container_name: xcord-redis
+    container_name: pink-redis

-    container_name: xcord-api
+    container_name: pink-api

-      DATABASE_URL: postgres://xcord:xcord@postgres:5432/xcord?sslmode=disable
+      DATABASE_URL: postgres://pink:pink@postgres:5432/pink?sslmode=disable

-      LIVEKIT_API_SECRET: xcord_dev_secret_key_32_chars_min
+      LIVEKIT_API_SECRET: pink_dev_secret_key_32_chars_min

-    container_name: xcord-livekit
+    container_name: pink-livekit

-      LIVEKIT_KEYS: "devkey: xcord_dev_secret_key_32_chars_min"
+      LIVEKIT_KEYS: "devkey: pink_dev_secret_key_32_chars_min"

-    container_name: xcord-redis-commander
+    container_name: pink-redis-commander

-    container_name: xcord-pgadmin
+    container_name: pink-pgadmin

-      PGADMIN_DEFAULT_EMAIL: admin@xcord.dev
+      PGADMIN_DEFAULT_EMAIL: admin@pink.dev
```

---

#### [MODIFY] `Backend/.env.example`

```diff
-DATABASE_URL=postgres://xcord:xcord@localhost:5432/xcord?sslmode=disable
+DATABASE_URL=postgres://pink:pink@localhost:5432/pink?sslmode=disable
```

---

#### [MODIFY] `Backend/.env`

```diff
-DATABASE_URL=postgres://xcord:xcord@localhost:5432/xcord?sslmode=disable
+DATABASE_URL=postgres://pink:pink@localhost:5432/pink?sslmode=disable
```

---

#### [MODIFY] `Backend/livekit.yaml`

```diff
-    devkey: xcord_dev_secret_key_32_chars_min
+    devkey: pink_dev_secret_key_32_chars_min
```

---

#### [MODIFY] `Backend/README.md`

```diff
-# XCORD Backend
+# Pink Backend

-git clone https://github.com/xcord/backend.git
+git clone https://github.com/pink/backend.git
```

---

## 🧪 Verification Plan

### Automated Tests

1. **Go Backend Build Test**:
```bash
cd Backend
go build ./...
```

2. **npm Package Install**:
```bash
cd frontdesktop
npm install
```

3. **Tauri Build Test**:
```bash
cd frontdesktop
npm run tauri build
```

4. **Go Tests**:
```bash
cd Backend
go test ./...
```

### Manual Verification

1. ✅ Tauri uygulamasının window başlığının "Pink" olduğunu doğrula
2. ✅ Overlay window başlığının "Pink Overlay" olduğunu doğrula
3. ✅ Settings sayfasındaki marka isminin "Pink" olduğunu doğrula
4. ✅ Sidebar'daki logo/ismin "Pink" olduğunu doğrula
5. ✅ Docker container isimlerinin "pink-*" formatında olduğunu doğrula
6. ✅ Database bağlantısının başarılı olduğunu doğrula

---

## ⚠️ Önemli Notlar

> [!WARNING]
> **Veritabanı Yeniden Oluşturulmalı**: PostgreSQL database ismi `xcord` → `pink` olarak değişeceği için mevcut veritabanı drop edilip yeniden oluşturulmalıdır.

> [!CAUTION]
> **JWT Token Geçersizliği**: `issuer` ve `audience` değerleri değişeceği için mevcut tüm JWT tokenlar geçersiz olacaktır. Kullanıcıların yeniden login olması gerekecektir.

> [!NOTE]
> **Zustand Store İsimleri**: LocalStorage'da saklanan store isimleri değişeceği için mevcut kullanıcı ayarları sıfırlanacaktır.

---

## 📝 Uygulama Sırası

1. **Önce Backend** - Go module name ve import path'leri değiştir
2. **Sonra Frontend** - Tauri ve React dosyalarını güncelle
3. **Docker/DevOps** - Configuration dosyalarını güncelle
4. **Database** - PostgreSQL'i yeniden oluştur
5. **Test** - Tüm componentlerin çalıştığını doğrula

---

## 🎯 Otomatik Değiştirme Komutu (Opsiyonel)

Backend Go dosyaları için toplu değişiklik:

```powershell
# Backend klasöründe çalıştır
Get-ChildItem -Path ".\internal" -Recurse -Filter "*.go" | ForEach-Object {
    (Get-Content $_.FullName) -replace '"xcord/', '"pink/' | Set-Content $_.FullName
}
```

---

*Bu plan onaylandığında uygulama aşamasına geçilecektir.*
