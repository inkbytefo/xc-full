# Pink Rebrand Roadmap (xcord → pink)

Bu roadmap, proje adının **xcord**’dan **pink**’e taşınmasını risk azaltacak şekilde fazlara böler. Amaç: her faz sonunda build/test geçen, çalışır bir durum bırakmak.

## Kapsam

- Frontend (Tauri/React): uygulama adı, window title’lar, localStorage anahtarları, overlay global flag’leri, paket adları
- Backend (Go): `go.mod` module adı, import path’ler (`xcord/...` → `pink/...`), config default’ları, JWT issuer/audience
- DevOps/Config: Docker image/container adları, database/redis adları, `.env.example`, LiveKit yapılandırması
- Data etkileri: DB adı değişimi, JWT token invalidasyonu, localStorage reset etkisi

## Faz 0 — Hazırlık ve Envanter (No-op)

**Çıktı**
- `xcord` geçen tüm alanların listesi (kod, config, docs, CI)
- Uygulanan test/build komutlarının net listesi

**Görevler**
- Kod tabanında arama: `xcord`, `XC`, `__XC_`, `xcord-auth`, `xcord-api`, `xc-` (case-insensitive)
- Etkilenen dosyaları gruplandır: Backend Go import’ları, frontend UI string’leri, config/env, docker, tauri/rust crate
- Güvenlik kontrolü: repoda `.env` takipte mi; takipteyse bu rename kapsamında değiştirmemek

**Kabul Kriterleri**
- Arama sonuçları “değiştirilecekler” listesine dönüştürülmüş durumda
- Build/test komutları doğrulanmış durumda (bu fazda kod değişikliği yok)

## Faz 1 — Backend: Go module ve import path geçişi

**Çıktı**
- Backend derlenir ve testleri geçer
- `go.mod` module adı `pink` olur ve tüm import path’ler güncellenir

**Görevler**
- [ ] `Backend/go.mod`: `module xcord` → `module pink`
- [ ] Tüm Go dosyalarında import path değişimi: `"xcord/...` → `"pink/..."`
- [ ] `Backend/internal/config/config.go`: `DATABASE_URL` default’unda `xcord` → `pink`
- [ ] `Backend/internal/infrastructure/auth/jwt.go`: `issuer/audience` değerleri `pink-*` olacak şekilde güncellenir
- [ ] `gofmt` ve `go mod tidy` ile mod/format tutarlılığı sağlanır

**Kabul Kriterleri**
- `cd Backend && go test ./...` başarılı
- `cd Backend && go build ./...` başarılı
- Çalışma zamanında startup (config parse, db bağlantısı) hata vermiyor

**Notlar / Etkiler**
- JWT `issuer/audience` değişimi nedeniyle mevcut token’lar geçersiz olur (login yeniden gerekir).

## Faz 2 — DevOps/Config: Docker, env örnekleri, LiveKit

**Çıktı**
- Docker compose ile servisler “pink-*” isimleriyle ayağa kalkar
- Ortam değişkenleri ve LiveKit config `pink` ile uyumludur

**Görevler**
- [x] `Backend/Makefile`: binary adı, docker image adı ve echo çıktıları `pink` olur
- [x] `Backend/docker-compose.yml`: container adları, `POSTGRES_*`, healthcheck, `DATABASE_URL` `pink` olur
- [x] `Backend/livekit.yaml`: `devkey` secret değeri `pink` formatına geçirilir
- [ ] `Backend/.env.example`: `DATABASE_URL` `pink` olur (dosya mevcut değildi)

**Kabul Kriterleri**
- `cd Backend && docker compose up -d` sonrası servisler sağlıklı (healthcheck pass)
- Backend container log’larında import/module kaynaklı hata yok

**Güvenlik Notu**
- `.env` dosyası repoda takip ediliyorsa bu kapsamda değiştirilmez; sadece `.env.example` güncellenir.

## Faz 3 — Frontend: Tauri/Rust crate, NPM package, UI string’leri, storage anahtarları

**Çıktı**
- Frontend build eder (Vite + Tauri) ve uygulama adı “Pink” görünür
- Storage/overlay anahtarları `pink-*` formatına taşınır

**Görevler**
- [ ] `frontdesktop/src-tauri/tauri.conf.json`: `productName`, `identifier`, `window.title` değerleri
- [ ] `frontdesktop/src-tauri/Cargo.toml`: crate ve lib isimleri (`xcord` → `pink`)
- [ ] `frontdesktop/src-tauri/src/main.rs`: lib çağrısı (`xcord_lib::run()` → `pink_lib::run()`)
- [ ] `frontdesktop/package.json`: npm package adı `pink`
- [ ] HTML title güncellemeleri: `frontdesktop/index.html`, `frontdesktop/overlay.html`
- [ ] Zustand store key’leri: `xcord-auth`, `xcord-ui` → `pink-*`
- [ ] Overlay/event bus isimleri: `xc-voice-bus-v1` vb. → `pink-*`
- [ ] Overlay pinned view global: `__XC_PINNED_VIEW` → `__PINK_PINNED_VIEW`
- [ ] UI text: Settings/Sidebar/ActionBar vb. “XCORD/XC” → “Pink”

**Kabul Kriterleri**
- `cd frontdesktop && npm install` başarılı
- `cd frontdesktop && npm run tauri build` başarılı
- Uygulama penceresi ve overlay başlıkları “Pink / Pink Overlay”

**Notlar / Etkiler**
- localStorage anahtarları değiştiği için kullanıcı ayarları sıfırlanır (beklenen etki).

## Faz 4 — Data/DB: PostgreSQL yeniden oluşturma ve migrasyon doğrulaması

**Çıktı**
- DB adı `pink`, migrasyonlar temiz uygulanır

**Görevler**
- [ ] Eski `xcord` DB’nin drop edilmesi (gerekirse yedek al)
- [ ] `pink` DB’nin oluşturulması ve migrasyonların uygulanması
- [ ] Uygulama ile temel akış doğrulaması (register/login, temel read/write)

**Kabul Kriterleri**
- Backend yeni DB’ye bağlanır ve migrasyonlar hatasız
- Temel API akışlarında 5xx görülmez

## Faz 5 — Regresyon ve teslim

**Çıktı**
- Rebrand tamam; repo genelinde “xcord” kalıntıları hedeflenen seviyede temizlenmiş

**Görevler**
- [ ] Repo genelinde kalan `xcord` referanslarını gözden geçir (docs dahil) ve karar ver: tut/temizle
- [ ] Manuel doğrulama: UI, overlay, auth, docker ortamı
- [ ] CI/build komutlarının yeşil olduğunu doğrula

**Kabul Kriterleri**
- Backend + Frontend build/test yeşil
- Marka adı kullanıcı yüzünde tutarlı: “Pink”

## Çalıştırma / Doğrulama Komutları

```bash
cd Backend
go test ./...
go build ./...
docker compose up -d

cd ../frontdesktop
npm install
npm run tauri build
```

