# Pink Backend - Güvenlik Uygulaması

> Versiyon: 1.1 | Tarih: 2025-12-28

---

## 📋 Güvenlik Prensipleri

Pink Backend, "Security by Design" prensibiyle geliştirilmiştir. Veri güvenliği, kimlik doğrulama ve yetkilendirme katmanları en güncel standartlara (Go 1.23+, RS256) göre yapılandırılmıştır.

---

## 🔐 Kimlik Doğrulama (Authentication)

### JWT (JSON Web Token)
Sistem, stateless kimlik doğrulama için JWT kullanır.
- **Algoritma**: RS256 (RSA Signature with SHA-256). Asimetrik şifreleme sayesinde private key API server'da kalırken, public key ile doğrulama yapılabilir.
- **Token Tipleri**:
    - `access_token`: Kısa süreli (ör. 15 dk), API istekleri için kullanılır.
    - `refresh_token`: Uzun süreli (ör. 7 gün), yeni access token almak için kullanılır.
- **Token Rotation**: Her refresh işleminde eski refresh token iptal edilir ve yenisi verilir (Güvenlik için).

### Şifre Güvenliği
- **Hashleme**: Şifreler asla düz metin olarak saklanmaz. `bcrypt` algoritması ile uygun maliyet (cost) faktörü kullanılarak hashlenir.
- **Doğrulama**: Şifre karmaşıklığı kayıt aşamasında `validator` ile kontrol edilir (en az 8 karakter, harf ve rakam kombinasyonu).

---

## 🛡️ Yetkilendirme (Authorization)

### Middleware Tabanlı Kontrol
Tüm korumalı rotalar `Authenticate` middleware'inden geçer:
1. `Authorization` header'ındaki Bearer token ayrıştırılır.
2. RS256 public key ile token imzası doğrulanır.
3. Token süresi (`exp`) kontrol edilir.
4. Başarılı ise `userID` context'e eklenerek handler'a iletilir.

### RBAC (Role-Based Access Control)
Sunucu ve Kanal seviyesinde yetkilendirme mevcuttur:
- **Owner**: Sunucuyu silme, üye atma, rol oluşturma yetkisine sahiptir.
- **Admin/Moderator**: Kanal yönetimi ve mesaj silme yetkilerine sahiptir.
- **Member**: Temel okuma/yazma yetkileri.

---

## 🛡️ API ve Ağ Güvenliği

### CORS (Cross-Origin Resource Sharing)
API, sadece izin verilen origin'lerden (Frontend URL) gelen isteklere yanıt verecek şekilde yapılandırılmıştır.
- `AllowOrigins`: Whitelist tabanlı kontrol.
- `AllowMethods`: GET, POST, PUT, PATCH, DELETE, OPTIONS.
- `AllowCredentials`: True (Session güvenliği için).

### Veri Doğrulama (Validation)
Tüm client inputları `internal/adapters/http/dto` katmanında valide edilir:
- Tipi uygun olmayan veriler reddedilir.
- XSS riskine karşı inputlar sanitize edilir (veya template motorlarında escaped edilir).
- SQL Injection riskine karşı `pgx` Prepared Statements ve SQL parametreleri kullanılır.

### Hız Sınırlama (Rate Limiting)
Brute-force ve DoS saldırılarını önlemek için Redis tabanlı rate limiter devrededir:
- Auth işlemleri için daha katı limitler.
- Global API limitleri (IP tabanlı).

---

## 📂 Dosya ve Medya Güvenliği
- Yüklenen dosyalar rastgele isimlendirilerek orijinal dosya adından kaynaklanabilecek saldırılar önlenir.
- MIME-type kontrolü ile sadece izin verilen formatlar (`image/*`, `video/*`) kabul edilir.

---

*Sonraki: [Real-time Communication](./06-real-time.md)*
