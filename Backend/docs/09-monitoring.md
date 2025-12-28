# Pink Backend - İzleme ve Loglama

> Versiyon: 1.1 | Tarih: 2025-12-28

---

## 📋 Genel Bakış

Pink Backend, sistem sağlığını ve performansını izlemek için yapılandırılmış (structured) loglama ve sağlık kontrol (health check) endpoint'lerini kullanır.

---

## 🪵 Loglama (Logging)

Sistemde Go'nun modern **`slog` (Structured Logging)** paketi kullanılır.

### Log Formatı
Loglar, JSON formatında üretilir. Bu sayede ElasticSearch, Datadog veya CloudWatch gibi sistemler tarafından kolayca parse edilir.

**Örnek Log:**
```json
{
  "time": "2025-12-28T14:00:00Z",
  "level": "ERROR",
  "msg": "Failed to create user",
  "error": "database connection timeout",
  "user_id": "01HXY..."
}
```

### Log Seviyeleri
- `DEBUG`: Geliştirme aşamasında detaylı bilgi.
- `INFO`: Normal sistem akışı (Server started, User logged in).
- `WARN`: Müdahale gerektirmeyen ama dikkat çeken durumlar.
- `ERROR`: Acil müdahale gerektiren kritik hatalar.

---

## 🏥 Sağlık Kontrolü (Health Checks)

API'nin ve bağımlılıklarının durumunu kontrol etmek için `/health` endpoint'i mevcuttur.

**Endpoint**: `GET /api/v1/health`

**Yanıt Örneği (Success):**
```json
{
  "status": "UP",
  "version": "1.2.0",
  "checks": {
    "database": "OK",
    "redis": "OK",
    "livekit": "OK"
  }
}
```

---

## ⚠️ Hata Takibi

Tüm uygulama içi hatalar merkezi bir noktada (Middleware) yakalanır ve uygun HTTP status koduna dönüştürülür. Kritik hatalar log seviyesi olarak `ERROR` işaretlenerek uyarı (alert) sitemlerini tetikleyecek şekilde yapılandırılmıştır.

---

## 📊 Performans İzleme (Önerilen)

- **Prometheus**: Metriklerin (Request count, Error rate, Latency) toplanması için.
- **Grafana**: Metriklerin görselleştirilmesi.
- **Sentry**: Uygulama içi panic ve istisnai durumların detaylı raporlanması.

---

*Sonraki: [Development Roadmap](./10-development-roadmap.md)*
