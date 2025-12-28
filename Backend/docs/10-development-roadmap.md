# Pink Backend - Geliştirme Yol Haritası (Roadmap)

> Versiyon: 1.1 | Tarih: 2025-12-28

---

## 📋 Mevcut Durum

Pink Backend, **Modular Monolith** mimarisinde, Go 1.23+ kullanılarak geliştirilmiştir. Temel özellikler (Auth, User, Server, Feed, Real-time) stabil bir şekilde çalışmaktadır.

### ✅ Tamamlanan Temel Özellikler
- **Kimlik Doğrulama**: RS256 JWT, Refresh Token Rotation.
- **Sunucu & Kanal**: RBAC 2.0 bitwise yetkilendirme, Moderasyon araçları (Ban, Timeout).
- **Sosyal Akış**: Twitter tarzı post, like, repost ve server wall.
- **Canlı Yayın**: LiveKit (WebRTC) ve OME (HLS) entegrasyonu.

---

## 🚀 Gelecek Planları (Roadmap)

### Faz 1: Kritik Eksikler ve İyileştirmeler (Kısa Vadeli)
- [ ] **Davet (Invite) Sistemi**: Sunucular için özel davet kodları ve süreli linkler.
- [ ] **Audit Log API**: Moderasyon loglarının yönetici ekranında görüntülenmesi.
- [ ] **Arama Motoru Geliştirmeleri**: ElasticSearch veya PostgreSQL Full-text Search ile daha hızlı ve esnek arama.
- [ ] **Medya Optimizasyonu**: Sunucu icon ve banner'ları için görsel yükleme ve boyutlandırma servisleri.

### Faz 2: Zengin Etkileşim ve Sosyal Özellikler (Orta Vadeli)
- [ ] **Emoji & Sticker**: Sunucuya özel emoji paketleri ve sticker desteği.
- [ ] **Gelişmiş Gizlilik**: Arkadaşlık sistemi, gizli profil ayarları ve mesaj istekleri.
- [ ] **Sunucu Keşfi (Discovery)**: Kategorilere göre genel sunucuları keşfetme arayüzü.
- [ ] **Thread Desteği**: Mesajlara alt başlıklar (threads) ekleyerek kanal düzenini koruma.

### Faz 3: Ölçeklenebilirlik ve Altyapı (Uzun Vadeli)
- [ ] **Mikroservislere Geçiş**: Sohbet (Messaging) ve Yayın (Streaming) servislerini bağımsız mikroservislere dönüştürme.
- [ ] **Global CDN Entegrasyonu**: Statik içerikler ve yayınlar için daha düşük gecikme.
- [ ] **Gelişmiş Analizler**: Sunucu sahipleri için üye etkileşim istatistikleri ve grafikler.
- [ ] **Mobil SDK**: React Native veya Flutter için optimize edilmiş backend API wrapper'ları.

---

## 📐 Teknik Vizyon
Pink, hızı ve sadeliği ön planda tutan bir platformdur. Amacımız, Go'nun performans avantajlarını kullanarak, milyonlarca kullanıcıya düşük gecikmeli, güvenli ve ölçeklenebilir bir sosyal deneyim sunmaktır.

---

*Sonraki: [Geri Dön - Proje Genel Bakış](./01-project-overview.md)*
