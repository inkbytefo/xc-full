# Pink Backend - Test Stratejisi

> Versiyon: 1.1 | Tarih: 2025-12-28

---

## 📋 Genel Yaklaşım

Pink Backend, yüksek kod kalitesi ve güvenilirlik için katmanlı bir test stratejisi izler. Testler, **Hexagonal Architecture** yapısına uygun olarak birim (unit) ve entegrasyon (integration) testleri olarak ayrılmıştır.

---

## 🧪 Test Türleri

### 1. Birim Testler (Unit Tests)
- **Domain Layer**: Entity metodlarının ve iş kurallarının testi.
- **Application Services**: Use-case'lerin izole testi. Bağımlılıklar (Repositories, External SDKs) mock'lanır.
- **Dizin**: Test edilen dosya ile aynı dizindedir (örn. `service_test.go`).

### 2. Entegrasyon Testleri (Integration Tests)
- **Infrastructure Layer**: Gerçek veritabanı (Postgres/Redis) bağlantıları ile repository testleri.
- **HTTP Handlers**: API endpoint'lerinin uçtan uca testi. `httptest` paketi veya Fiber'in `Test` metodu kullanılır.

---

## 🛠️ Kullanılan Araçlar

- **Testify**: `stretchr/testify` kütüphanesi ile `assert` ve `mock` yetenekleri.
- **Go Mock**: Interface'ler üzerinden otomatik mock üretimi.
- **Testing Package**: Go'nun standart `testing` kütüphanesi.

---

## 🚀 Testleri Çalıştırma

### Tüm Testleri Çalıştır
```bash
make test
```

### Kod Kapsamı (Coverage) Raporu
```bash
make test-coverage
```
Bu komut, `coverage.html` dosyasını oluşturur ve tarayıcıda açarak hangi satırların test edildiğini görselleştirir.

---

## ✍️ Test Yazma Kuralları

1.  **Tabular Tests**: Farklı senaryolar için `struct slice` tabanlı testler tercih edilmelidir.
2.  **Mocking**: Dış bağımlılıklar için daima interface'ler üzerinden mocklama yapılmalıdır.
3.  **Naming**: Test fonksiyonları `Test[FonksiyonAdı]_[Senaryo]` formatında isimlendirilmelidir.

```go
func TestRegister_Success(t *testing.T) {
    // Setup
    // Mock expectations
    // Action
    // Verification
}
```

---

*Sonraki: [Monitoring and Logging](./09-monitoring.md)*
