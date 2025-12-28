# Pink Backend - Dağıtım ve Kurulum

> Versiyon: 1.1 | Tarih: 2025-12-28

---

## 📋 Gereksinimler

- Go 1.23+
- Docker ve Docker Compose
- PostgreSQL 16
- Redis 7
- `golang-migrate` CLI (Migrationlar için)

---

## 🚀 Hızlı Başlangıç (Docker ile)

Sistemi tüm bağımlılıkları (DB, Redis, API) ile ayağa kaldırmak için:

```bash
# Bağımlılıkları ve API'yi başlatır
make docker-up

# Logları takip et
make docker-logs

# Sistemi durdur
make docker-down
```

---

## 🛠️ Manuel Geliştirme Ortamı

1.  **Bağımlılıkları Yükle**:
    ```bash
    make deps
    ```

2.  **Veritabanı migration'larını çalıştır**:
    ```bash
    # DATABASE_URL ortam değişkenini ayarlayın veya Makefile içindeki varsayılanı kullanın
    make migrate-up
    ```

3.  **Sunucuyu Başlat (Hot-Reload ile)**:
    ```bash
    # 'air' yüklü olmalıdır
    make dev
    ```

---

## ⚙️ Yapılandırma (Environment Variables)

Uygulama, `.env` dosyası veya ortam değişkenleri üzerinden konfigüre edilir. Örnek yapılandırma:

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `APP_PORT` | `8080` | API sunucu portu |
| `DATABASE_URL` | `postgres://...` | PostgreSQL bağlantı stringi |
| `REDIS_URL` | `redis://...` | Redis bağlantı stringi |
| `JWT_PRIVATE_KEY` | `keys/private.pem` | RS256 Private key yolu |
| `JWT_PUBLIC_KEY` | `keys/public.pem` | RS256 Public key yolu |
| `LIVEKIT_URL` | `http://...` | LiveKit sunucu adresi |
| `LIVEKIT_API_KEY` | `devkey` | LiveKit API Key |

---

## 📦 Build ve CI/CD

### Docker Build
Production imajı oluşturmak için:
```bash
make docker-build
```

### Binary Build
Executable dosya oluşturmak için:
```bash
make build
```
Oluşturulan binary `bin/pink-api` dizinine kaydedilir.

---

## 🔄 Veritabanı Yönetimi

Yeni bir migration oluşturmak için:
```bash
make migrate-create
```
Bu komut, `migrations/` dizininde yeni bir dosya çifti (`.up.sql` ve `.down.sql`) oluşturur.

---

*Sonraki: [Testing Strategy](./08-testing.md)*
