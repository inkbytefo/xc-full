# Backend API Status ✅

> Bu dosya frontend ile backend arasındaki API uyumluluğunu takip eder.
> Son güncelleme: 2025-12-22

---

## ✅ Tamamlanan Endpoint'ler

### Kullanıcı Profil Endpoint'leri

| Endpoint | Durum | Açıklama |
|----------|-------|----------|
| `GET /api/v1/users/:id` | ✅ | Kullanıcı profili |
| `PATCH /api/v1/me` | ✅ | Profil güncelleme |
| `POST /api/v1/users/:id/follow` | ✅ | Takip et |
| `DELETE /api/v1/users/:id/follow` | ✅ | Takibi bırak |
| `GET /api/v1/users/:id/followers` | ✅ | Takipçiler listesi |
| `GET /api/v1/users/:id/following` | ✅ | Takip edilenler listesi |
| `GET /api/v1/users/:id/posts` | ✅ (mevcut) | Kullanıcı gönderileri |

### Server Wall Endpoint'leri (Yeni!)

| Endpoint | Durum | Açıklama |
|----------|-------|----------|
| `GET /api/v1/servers/:id/wall` | ✅ | Duvar gönderilerini listele |
| `POST /api/v1/servers/:id/wall` | ✅ | Gönderi oluştur |
| `DELETE /api/v1/servers/:id/wall/:postId` | ✅ | Gönderi sil |
| `POST /api/v1/servers/:id/wall/:postId/pin` | ✅ | Sabitle |
| `DELETE /api/v1/servers/:id/wall/:postId/pin` | ✅ | Sabitlemeyi kaldır |

---

## 🟡 Bekleyen Endpoint'ler

| Endpoint | Öncelik | Açıklama |
|----------|---------|----------|
| `GET /api/v1/users/:id/likes` | Orta | Beğenilen gönderiler |
| `GET /api/v1/users/:id/media` | Orta | Medya gönderileri |

---

## 📝 Response Formatı

```json
{
  "data": { ... }
}
```

Hata durumunda:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Açıklama"
  }
}
```

---

*Son güncelleme: 2025-12-22*
