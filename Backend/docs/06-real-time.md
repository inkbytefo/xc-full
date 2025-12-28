# Pink Backend - Gerçek Zamanlı İletişim

> Versiyon: 1.1 | Tarih: 2025-12-28

---

## 📋 Giriş

Pink, anlık etkileşimler (mesajlaşma, bildirimler, canlı yayın sohbeti) için WebSocket protokolünü kullanır. Sistem, binlerce eşzamanlı bağlantıyı verimli bir şekilde yönetebilecek "Hub-Client" modeline dayanır.

---

## 🔌 Bağlantı Protokolü

### WebSocket URL
Bağlantı kurmak için önce bir `ws-token` alınmalıdır.
`ws://api.pink.com/ws?token=<ws_token>`

### Bağlantı Akışı
1. **El Sıkışma (Handshake)**: Standart HTTP(S) bağlantısı WebSocket'e yükseltilir.
2. **Kimlik Doğrulama**: `token` query parametresi üzerinden JWT doğrulaması yapılır.
3. **Kayıt (Registration)**: Kullanıcı ID'si ile bağlantı eşleştirilir ve `Hub`'a eklenir.
4. **Kalp Atışı (Heartbeat)**: Client ve Server arasında düzenli PING/PONG paketleri gönderilerek bağlantı sağlığı korunur.

---

## 📡 Mesaj Formatı

Tüm mesajlar JSON formatındadır ve aşağıdaki temel yapıyı izler:

```json
{
  "op": "EVENT_NAME",
  "d": {
    "key": "value"
  }
}
```

---

## 🔔 Abonelik Sistemi (Pub/Sub)

Client'lar sadece ilgilendikleri kanalları/konuşmaları dinlemek için abonelik mesajları gönderirler.

### Desteklenen Abonelik Tipleri:
- `CHANNEL`: Spesifik bir sunucu kanalındaki mesajlar.
- `CONVERSATION`: Spesifik bir DM konuşması.
- `STREAM`: Canlı yayın sohbeti.
- `USER`: Kullanıcıya özel bildirimler (global).

**Abonelik Örneği:**
```json
{
  "op": "SUBSCRIBE",
  "d": {
    "subscriptions": [
      { "type": "CHANNEL", "id": "ch_123" },
      { "type": "CONVERSATION", "id": "dm_456" }
    ]
  }
}
```

---

## 🚀 Olay Tipleri (Events)

### Sunucudan İstemciye (Outbound)
| Event | Açıklama |
|-------|----------|
| `CONNECTED` | Bağlantı başarıyla kuruldu. |
| `MESSAGE_CREATE` | Yeni bir kanal veya DM mesajı geldi. |
| `MESSAGE_UPDATE` | Bir mesaj düzenlendi. |
| `TYPING_START` | Bir kullanıcı yazmaya başladı. |
| `NOTIFICATION` | Yeni bir bildirim (beğeni, takip vb.) geldi. |
| `STREAM_MSG` | Canlı yayın sohbetine mesaj geldi. |

### İstemciden Sunucuya (Inbound)
| Event | Açıklama |
|-------|----------|
| `SUBSCRIBE` | Kanallara abone ol. |
| `UNSUBSCRIBE` | Abonelikten çık. |
| `TYPING` | Yazıyor bilgisini paylaş. |
| `STREAM_MSG` | Canlı yayın sohbetine mesaj gönder. |

---

## 🛠️ Teknik Altyapı
- **Kitaplık**: `github.com/gofiber/contrib/websocket`
- **Eşzamanlılık**: Her bağlantı için ayrı bir yazma ve okuma goroutine'i (`pump`) çalışır.
- **Güvenlik**: Token süresi dolduğunda bağlantı otomatik olarak koparılır.
- **Ölçekleme**: Birden fazla API instance'ı varsa, Redis Pub/Sub üzerinden mesajlar instance'lar arası senkronize edilir.

---

*Sonraki: [Deployment Procedures](./07-deployment.md)*
