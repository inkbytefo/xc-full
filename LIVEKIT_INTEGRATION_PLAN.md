# XCORD - LiveKit Entegrasyon Planı (2025 Güncel Best Practices)

Bu belge, XCORD platformuna LiveKit tabanlı sesli ve görüntülü sohbet özelliklerinin en yüksek performans ve profesyonel standartlarda entegre edilmesi için gereken teknik adımları ve en iyi pratikleri içermektedir.

## 1. Mimari Genel Bakış

LiveKit, WebRTC tabanlı bir Selective Forwarding Unit (SFU) mimarisi kullanır. Bu mimaride istemciler medya akışlarını sunucuya gönderir ve sunucu bu akışları diğer katılımcılara yönlendirir. Entegrasyonumuz üç ana bileşenden oluşacaktır:

1.  **LiveKit Server**: Medya trafiğini yöneten SFU (Docker'da mevcut).
2.  **Backend (Go/Fiber)**: Token üretimi, oda yönetimi ve Webhook işleme.
3.  **Frontend (React/TypeScript)**: İstemci tarafı medya yönetimi ve kullanıcı arayüzü.

---

## 2. Backend Geliştirmeleri (Performance & State)

### 2.1 Webhook Entegrasyonu [KRİTİK]
Şu anki yapıda katılımcı listesi LiveKit'ten anlık sorgulanmaktadır. Bu durum büyük ölçekte performans sorunlarına yol açabilir.
-   **Aksiyon**: `/api/v1/webhooks/livekit` endpoint'i oluşturulmalıdır.
-   **Amaç**: Katılımcıların odaya giriş/çıkış (ParticipantJoined/Left) olaylarını yakalayıp veritabanımızdaki `voice_channels` durumunu senkronize etmek.
-   **Fayda**: "Hangi kanalda kim var?" bilgisini veritabanından hızlıca çekebilmek.

### 2.2 Katılımcı Metadatası (Metadata & Attributes)
LiveKit katılımcılarına kullanıcı profili bilgilerini (ad, avatar, rol vb.) gömerek frontend tarafında ek API isteklerini önlemeliyiz.
-   **Aksiyon**: `GenerateToken` fonksiyonunda `SetMetadata` kullanılarak kullanıcı bilgileri JSON olarak eklenmelidir.

### 2.3 Redis Ölçeklendirmesi
Birden fazla LiveKit node'u çalıştırılacaksa Redis entegrasyonu zorunludur.
-   **Aksiyon**: `livekit.yaml` dosyasında Redis konfigüre edilmelidir (Docker-compose'da Redis zaten mevcut).

---

## 3. Frontend Geliştirmeleri (Quality & UX)

### 3.1 Medya Optimizasyonları
Performansı maksimize etmek için şu özellikler aktif edilmelidir:
-   **Adaptive Stream**: İstemcinin sadece o an görünür olan videoları ve uygun çözünürlükte çekmesini sağlar. (Zaten aktif).
-   **Dynacast**: Yayıncının sadece izleyicilerin ihtiyaç duyduğu kalitede yayın yapmasını sağlar. (Zaten aktif).
-   **Simulcast**: Tek bir yayının farklı çözünürlüklerde (High, Medium, Low) gönderilmesi sağlanmalıdır.

### 3.2 Ses Kalitesi ve Gürültü Engelleme
-   **Noise Suppression**: `livekit-client` içindeki gürültü engelleme eklentileri kullanılmalıdır.
-   **Audio RED (Redundant Encoding)**: Paket kaybı olan ağlarda ses kalitesini korumak için aktif edilmelidir.
-   **Hi-Fi Audio**: Müzik veya yüksek kalite gereken odalar için bitrate 128kbps+ seviyesine çekilmelidir.

### 3.3 İleri Düzey UI/UX
-   **Speaking Indicator**: Kimin konuştuğunu gösteren halka/dalga animasyonu.
-   **Connection Quality Indicator**: Kullanıcıların ağ durumunu (Gecikme, Paket Kaybı) gösteren simgeler.
-   **Hardware Selection**: Mikrofon, Kamera ve Hoparlör seçimi için özel bir ayarlar menüsü.

---

## 4. Altyapı ve Güvenlik

### 4.1 TURN/STUN Sunucuları
Kurumsal ağlarda veya kısıtlı firewall arkasındaki kullanıcıların bağlanabilmesi için:
-   **Aksiyon**: LiveKit'in gömülü TURN sunucusu üzerinden TLS (443 portu) desteği aktif edilmelidir.

### 4.2 Kayıt ve Yayın (Egress)
Profesyonel modüller için (Dersi kaydetme, Youtube'a yayınlama):
-   **Aksiyon**: LiveKit Egress servisi projenin ileri aşamalarında docker-compose'a eklenmelidir.

---

## 5. Doğrulama ve Test Planı

1.  **Yük Testi**: `lk load-test` aracı ile 100+ katılımcı simülasyonu.
2.  **Network Simülasyonu**: %10-%20 paket kaybı olan durumlarda sesin stabilitesinin kontrolü.
3.  **Cross-Browser Test**: Chrome, Safari ve Firefox (özellikle mobil) uyumluluğunun kontrolü.

---
**Tarih**: 25.12.2025
**Durum**: Plan Hazırlandı
