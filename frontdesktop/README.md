# XCORD (Tauri v2 + React + TypeScript)

XCORD, Discord + Twitter hibrid bir sosyal platform prototipidir. Tauri v2 üzerinde çalışan (desktop-first) bir React uygulamasıdır.

## 🚀 Özellikler

### Core Features
- **Feed**: Twitter tarzı timeline, post paylaşma, like/repost/bookmark
- **DM**: Birebir mesajlaşma, read receipts, optimistic updates
- **Servers**: Discord tarzı sunucu-kanal yapısı (text + voice)
- **Live**: Twitch tarzı canlı yayın sistemi
- **Notifications**: Bildirim merkezi
- **Settings**: Kullanıcı ve uygulama ayarları

### UI/UX
- Modern glassmorphism tasarım
- Premium animasyonlar ve geçişler
- URL-based routing (React Router)
- Responsive layout sistemi
- Dark theme optimizasyonu

### Mimari
- Feature-based klasör yapısı (`src/features/`)
- Mock API ile bağımsız frontend geliştirme
- TypeScript ile tip güvenliği
- Cursor-based pagination
- Optimistic UI updates

## 📁 Proje Yapısı

```
src/
├── api/              # API client ve tipler
├── components/       # Genel UI bileşenleri
├── features/         # Özellik modülleri
│   ├── feed/         # Timeline + Posts
│   ├── dm/           # Direct Messages
│   ├── servers/      # Servers + Channels
│   ├── live/         # Live Streaming
│   ├── notifications/
│   ├── settings/
│   └── profile/
├── lib/              # Utilities
└── router.tsx        # React Router config
```

## 🛠️ Geliştirme

### Ön Koşullar
- Node.js (LTS)
- Rust toolchain (Tauri için)

### Komutlar

```bash
# Bağımlılıkları kur
npm install

# Web dev server başlat
npm run dev

# TypeScript kontrolü
npm run typecheck

# Production build
npm run build

# Tauri dev (desktop)
npm run tauri -- dev

# Tauri bundle (installer)
npm run tauri -- build
```

### Env Değişkenleri

| Değişken | Değerler | Açıklama |
|----------|----------|----------|
| `VITE_API_MODE` | `mock` (default) / `real` | API modu |

## 📚 Dokümantasyon

| Doküman | Açıklama |
|---------|----------|
| [Platform Spec](docs/platform-spec.md) | Detaylı API ve veri modelleri |
| [Mock API](docs/mock-api.md) | Mock endpoint sözleşmesi |
| [Roadmap](docs/roadmap.md) | Proje yol haritası |

## 🏗️ Build Çıktıları

- Windows exe: `src-tauri/target/release/xcord.exe`
- Installer: `src-tauri/target/release/bundle/**`

## 💻 Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [TypeScript](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next)

## 📄 Lisans

Private - All rights reserved
