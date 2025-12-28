# Pink Backend - API Spesifikasyonu

> Versiyon: 1.2 | Tarih: 2025-12-28 | Temel URL: `/api/v1`

---

## 📋 Giriş

Pink API, RESTful prensiplerine uygun olarak tasarlanmıştır. Tüm istekler ve yanıtlar `application/json` formatındadır. 

### Standart Yanıt Formatı
Tüm başarılı yanıtlar bir `data` objesi içinde döner. Liste yanıtları genellikle `nextCursor` alanını içerir.

### Standart Hata Formatı
Hata durumunda dönen yapı:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "İnsan tarafından okunabilir mesaj",
    "details": {
      "field": "Hata detayı"
    }
  }
}
```

---

## 🔐 Kimlik Doğrulama (Auth)

Tüm korumalı endpoint'ler `Authorization: Bearer <token>` header'ı gerektirir.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/register` | Yeni kullanıcı kaydı |
| POST | `/auth/login` | Email/Handle ve şifre ile giriş |
| POST | `/auth/refresh` | Refresh token ile access token yenileme |
| POST | `/auth/logout` | Refresh token'ı geçersiz kıl ve çıkış yap |
| GET | `/auth/ws-token` | WebSocket bağlantısı için kısa süreli token al |

---

## 👤 Kullanıcı ve Profil (User)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/me` | Oturum açan kullanıcının tam profilini getir |
| PATCH | `/me` | Profil bilgilerini (displayName, bio, avatar) güncelle |
| GET | `/me/privacy` | Gizlilik ve görünürlük ayarlarını getir |
| PATCH | `/me/privacy` | Gizlilik ayarlarını güncelle |
| GET | `/users/:id` | ID ile kullanıcı profilini getir |
| GET | `/users/handle/:handle` | Kullanıcı adı (@handle) ile profil getir |
| POST | `/users/:id/follow` | Kullanıcıyı takip et (Gizli profilde istek gönderir) |
| DELETE | `/users/:id/follow` | Takipten çık |

---

## 🏰 Sunucular (Servers)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/servers` | Katılınan tüm sunucuların listesi |
| POST | `/servers` | Yeni bir sunucu oluştur |
| GET | `/servers/:id` | Sunucu detayları ve üyelik durumu |
| PATCH | `/servers/:id` | Sunucu ayarlarını (isim, açıklama, icon) güncelle |
| DELETE | `/servers/:id` | Sunucuyu sil (Sadece sahipler) |
| POST | `/servers/:id/join` | Açık sunucuya katıl veya gizli sunucuya istek gönder |
| POST | `/servers/:id/leave` | Sunucudan ayrıl |
| GET | `/servers/:id/members` | Üye listesi (sayfalı) |

---

## 📺 Kanallar (Channels)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/servers/:id/channels` | Sunucudaki tüm kanalları getir |
| POST | `/servers/:id/channels` | Yeni kanal oluştur (text, voice, video, category) |
| PATCH | `/servers/:id/channels/reorder` | Kanal sıralamasını toplu güncelle |
| PATCH | `/servers/:id/channels/:chId` | Kanal ayarlarını güncelle |
| DELETE | `/servers/:id/channels/:chId` | Kanalı sil |

---

## 💬 Mesajlaşma (Messaging)

### Kanal Mesajları
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/servers/:id/channels/:chId/messages` | Kanal mesaj geçmişi (sayfalı) |
| POST | `/servers/:id/channels/:chId/messages` | Kanala mesaj gönder (reply desteğiyle) |
| PATCH | `/servers/:id/channels/:chId/messages/:msgId` | Mesajı düzenle |
| DELETE | `/servers/:id/channels/:chId/messages/:msgId` | Mesajı sil |

### Özel Mesajlar (DM)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/dm/conversations` | Tüm aktif konuşmaların listesi |
| POST | `/dm/conversations` | Yeni bir konuşma başlat |
| GET | `/dm/conversations/:id/messages` | Konuşma geçmişi |
| POST | `/dm/conversations/:id/messages` | Mesaj gönder |

---

## 📝 Sosyal Akış ve Sunucu Duvarı (Feed & Wall)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/feed` | Ana sayfa akışı (Takip edilenler ve global) |
| POST | `/posts` | Yeni post paylaş (resim desteğiyle) |
| POST | `/posts/:id/like` | Postu beğen/beğeniyi kaldır |
| POST | `/posts/:id/repost` | Repost yap/kaldır |
| GET | `/servers/:id/wall` | Sunucu duvarındaki postları getir |
| POST | `/servers/:id/wall` | Sunucu duvarına post yaz |

---

## 🎥 Canlı Yayın ve Sesli İletişim (Live & Voice)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/live/streams` | Şu an aktif olan genel yayınlar |
| POST | `/live/streams` | Yayın hazırla ve Stream Key al |
| GET | `/live/me` | Kendi yayın ayarlarını ve anahtarını getir |
| POST | `/live/me/regenerate-key` | Yayın anahtarımı yenile |
| POST | `/voice-channels/:id/token` | Sesli/Görüntülü kanal için WebRTC token al |

---

## 🔍 Arama (Search)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/search` | Global arama (User, Server, Post) |
| GET | `/search/users` | Kullanıcı ara |
| GET | `/search/servers` | Sunucu ara |

---

## 🔌 WebSocket (Real-time)

**URL:** `ws://api.pink.com/ws?token=<ws_token>`

WebSocket bağlantısı kullanıcı bazlıdır. Bir kez bağlandıktan sonra tüm DM, Sunucu ve Bildirim eventlerini alır.

**Temel Event Yapısı:**
```json
{
  "op": "EVENT_NAME",
  "d": { ... veriler ... }
}
```

---

*Not: Tüm API çağrıları için rate limiting uygulanmaktadır. Hata kodları ve detaylı şemalar için iç dökümantasyona başvurunuz.*
