# XC Overlay Roadmap

Xbox Game Bar benzeri oyun içi overlay sistemi için teknik analiz ve yol haritası.

---

## 1. Mevcut XC Mimarisi Analizi

### A. Tech Stack

| Katman | Teknoloji | Durum |
|:---|:---|:---|
| **Desktop Runtime** | Tauri 2.0 (Rust) | ✅ Zaten kullanılıyor |
| **Frontend** | React + TypeScript + Vite | ✅ Feature-based architecture |
| **Backend API** | Go + Fiber + PostgreSQL | ✅ Clean Architecture |
| **Real-time** | WebSocket + LiveKit | ✅ Voice/Video desteği |

### B. Tauri Avantajları (Overlay için)

```
┌─────────────────────────────────────────────────────┐
│  XC Masaüstü Uygulaması                             │
│  ┌─────────────────────────────────────────────────┤
│  │  Tauri Runtime (Rust)                           │
│  │  ├── Window Manager (Multi-window desteği)      │
│  │  ├── System Tray                                │
│  │  ├── Global Shortcuts                           │
│  │  └── Native APIs (Process detection)            │
│  ├─────────────────────────────────────────────────┤
│  │  WebView2 (Chromium)                            │
│  │  └── React Frontend                             │
│  └─────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────┘
```

**Electron vs Tauri:**
| Metrik | Electron | Tauri |
|:---|:---|:---|
| RAM Kullanımı | ~150-300MB | ~30-50MB |
| Executable Boyutu | ~150MB | ~10MB |
| Overlay Uygunluğu | Orta | Mükemmel |

---

## 2. Xbox Game Bar Özellik Analizi

### Klonlanacak Özellikler

| Özellik | Xbox Game Bar | XC Karşılığı | Öncelik |
|:---|:---|:---|:---:|
| **Overlay Toggle** | Win+G | Shift+Tab (yapılandırılabilir) | 🔴 P1 |
| **Friend List** | Xbox Friends | XC Friends + DMs | 🔴 P1 |
| **Voice Chat** | Party Chat | XC Voice Rooms | ✅ Var |
| **Widget System** | Spotify, Performance | Modüler Widgetlar | 🟡 P2 |
| **Game Detection** | Auto-detect | Process Scanner | 🟡 P2 |
| **Screenshot/Record** | Native | Tauri Plugin | 🟢 P3 |
| **AI Copilot** | Game tips | ChatGPT entegrasyonu | 🟢 P3 |

---

## 3. Teknik Implementasyon Stratejisi

### A. Multi-Window Architecture

Tauri, aynı anda birden fazla pencere açabilir. Ana uygulama ve Overlay ayrı pencereler olacak:

```rust
// src-tauri/src/lib.rs - YENİ YAPISI
use tauri::{Manager, WindowBuilder, WindowUrl};

#[tauri::command]
fn toggle_overlay(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_window("overlay") {
        // Toggle visibility
        if overlay.is_visible().unwrap_or(false) {
            overlay.hide().unwrap();
        } else {
            overlay.show().unwrap();
            overlay.set_focus().unwrap();
        }
    }
}

#[tauri::command]
fn create_overlay(app: tauri::AppHandle) {
    let _overlay = WindowBuilder::new(
        &app,
        "overlay",
        WindowUrl::App("overlay.html".into())
    )
    .title("XC Overlay")
    .decorations(false)        // Çerçevesiz
    .transparent(true)         // Şeffaf arka plan
    .always_on_top(true)       // Her zaman üstte
    .skip_taskbar(true)        // Taskbar'da görünmez
    .visible(false)            // Başta gizli
    .fullscreen(true)          // Tam ekran kaplama
    .build()
    .unwrap();
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::init())
        .setup(|app| {
            // Global shortcut: Shift+Tab
            app.global_shortcut_manager()
                .register("Shift+Tab", move || {
                    toggle_overlay(app.handle());
                })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_overlay,
            create_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### B. Click-Through Mode (Ghost Mode)

Widgetlar "sabitlendiğinde" oyunu engellemeden üzerinde kalmalı:

```rust
// Windows API ile click-through
#[cfg(target_os = "windows")]
fn set_click_through(window: &tauri::Window, enabled: bool) {
    use windows::Win32::UI::WindowsAndMessaging::*;
    
    let hwnd = window.hwnd().unwrap();
    let mut ex_style = unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) };
    
    if enabled {
        ex_style |= WS_EX_TRANSPARENT.0 as i32;
    } else {
        ex_style &= !(WS_EX_TRANSPARENT.0 as i32);
    }
    
    unsafe { SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style); }
}
```

### C. Game Detection Service

```rust
// Arka planda çalışan oyun tespit servisi
use sysinfo::{ProcessExt, System, SystemExt};

const KNOWN_GAMES: &[&str] = &[
    "valorant.exe",
    "leagueoflegends.exe", 
    "csgo.exe",
    "gta5.exe",
    "cyberpunk2077.exe",
];

#[tauri::command]
fn detect_running_game() -> Option<String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    for (_, process) in sys.processes() {
        let name = process.name().to_lowercase();
        if KNOWN_GAMES.iter().any(|g| name.contains(g)) {
            return Some(name);
        }
    }
    None
}
```

---

## 4. Frontend Overlay Mimarisi

### A. Yeni Dosya Yapısı

```
src/
├── features/
│   ├── overlay/                    # YENİ
│   │   ├── OverlayApp.tsx          # Overlay root
│   │   ├── OverlayHeader.tsx       # Üst bar (kapatma, ayarlar)
│   │   ├── widgets/
│   │   │   ├── FriendsWidget.tsx
│   │   │   ├── ChatWidget.tsx
│   │   │   ├── PerformanceWidget.tsx
│   │   │   └── SpotifyWidget.tsx
│   │   └── hooks/
│   │       ├── useOverlayMode.ts   # Toggle state
│   │       └── useGameDetection.ts
│   └── ...
├── overlay.html                    # Overlay entry point
└── overlay-main.tsx                # Overlay React entry
```

### B. Overlay UI Tasarımı

```
┌─────────────────────────────────────────────────────────────┐
│ [XC Logo]                              [Minimize] [Settings]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Friends   │  │    Chat     │  │   Voice     │         │
│  │   Online    │  │   #general  │  │   Room 1    │         │
│  │             │  │             │  │             │         │
│  │  @ahmet ●   │  │  mesaj...   │  │  🎤 Mute    │         │
│  │  @mehmet ●  │  │             │  │  🔊 Deafen  │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  [📌 Pin Widget]                    [Press Shift+Tab to    │
│                                      return to game]       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 🎯 Killer Feature: PiP (Picture-in-Picture) over Game

XC'yi rakiplerinden ayıran öldürücü özellik: **Oyun oynarken Alt-Tab yapmadan yayın/ekran paylaşımı izleme.**

### A. Konsept

```
┌─────────────────────────────────────────────────────────────────────┐
│                          OYUN (LoL, Valorant)                      │
│                                                                     │
│  ┌─────────────────┐                      ┌─────────────────┐      │
│  │ 📌 Pinned       │                      │ 📌 Pinned       │      │
│  │                 │                      │                 │      │
│  │ Ahmet'in Ekranı │                      │ Turnuva Yayını  │      │
│  │ (WebRTC)        │                      │ (HLS)           │      │
│  │                 │                      │                 │      │
│  │ 🟢 Konuşuyor    │                      │ 🔴 CANLI        │      │
│  └─────────────────┘                      └─────────────────┘      │
│                                                                     │
│                    Tıklamalar OYUNA gider,                         │
│                    Görüntü XC'den gelir                            │
└─────────────────────────────────────────────────────────────────────┘
```

### B. Widget Mimarisi: Floating Windows

Her video bir sürüklenebilir, boyutlandırılabilir `<div>` içinde yaşar:

```
src/features/overlay/widgets/
├── UniversalVideoWidget.tsx   # HLS + WebRTC unified player
├── PinnedWidgetContainer.tsx  # Drag & resize container
└── hooks/
    ├── usePinnedWidgets.ts    # Pinned widget state management
    └── useVideoSource.ts       # HLS vs WebRTC detection
```

### C. Ghost Mode (Hayalet Modu) Akışı

```
┌──────────────┐    Shift+Tab     ┌──────────────┐
│  OVERLAY     │◀────────────────▶│    OYUN      │
│  (Aktif)     │                  │   (Aktif)    │
│              │                  │              │
│ • Fare aktif │                  │ • Fare oyun  │
│ • Widgetlar  │   📌 Pin tuşu   │ • Pinlenmiş  │
│   etkileşimli│ ───────────────▶│   widgetlar  │
│              │                  │   GÖRÜNÜR    │
│              │                  │   ama        │
│              │                  │   TIKLANAAZ  │
└──────────────┘                  └──────────────┘
```

**Pin Mantığı:**
1. `Shift+Tab` → Overlay açılır
2. Video widget'ı sürükle ve konumlandır
3. **📌 Pin** butonuna tıkla
4. `Shift+Tab` → Overlay kapanır
5. **Video kalır, opacity %70, click-through aktif**

### D. Universal Video Widget

İki farklı kaynak türünü tek bileşende birleştir:

```typescript
// features/overlay/widgets/UniversalVideoWidget.tsx
import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

type VideoSource = 
  | { type: 'hls'; url: string }           // Twitch/XC Live
  | { type: 'webrtc'; stream: MediaStream }; // Discord benzeri ekran paylaşımı

interface Props {
    source: VideoSource;
    isPinned: boolean;
    onPin: () => void;
    onClose: () => void;
    speaker?: { name: string; isSpeaking: boolean };
    ghostMode?: boolean;
}

export function UniversalVideoWidget({ 
    source, 
    isPinned, 
    onPin, 
    onClose,
    speaker,
    ghostMode 
}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [size, setSize] = useState({ width: 320, height: 180 });

    // ABR: Widget boyutuna göre kalite ayarla
    useEffect(() => {
        if (source.type === 'hls' && hlsRef.current) {
            const targetLevel = size.width < 400 ? 0 : size.width < 800 ? 1 : 2;
            hlsRef.current.currentLevel = targetLevel; // 360p, 720p, 1080p
        }
    }, [size, source]);

    useEffect(() => {
        if (!videoRef.current) return;

        if (source.type === 'webrtc') {
            // Discord-style WebRTC stream
            videoRef.current.srcObject = source.stream;
        } else {
            // Twitch-style HLS stream
            if (Hls.isSupported()) {
                const hls = new Hls({ lowLatencyMode: true });
                hls.loadSource(source.url);
                hls.attachMedia(videoRef.current);
                hlsRef.current = hls;
            }
        }

        return () => hlsRef.current?.destroy();
    }, [source]);

    return (
        <Rnd
            default={{ x: 50, y: 50, width: 320, height: 180 }}
            minWidth={200}
            minHeight={112}
            onResizeStop={(_, __, ref) => setSize({
                width: ref.offsetWidth,
                height: ref.offsetHeight
            })}
            style={{
                opacity: ghostMode ? 0.7 : 1,
                pointerEvents: ghostMode ? 'none' : 'auto',
            }}
            className="rounded-lg overflow-hidden shadow-2xl border border-white/10"
        >
            {/* Video */}
            <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover bg-black"
            />

            {/* Overlay Controls (sadece aktif modda) */}
            {!ghostMode && (
                <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
                    {/* Streamer Info */}
                    <div className="flex items-center gap-2">
                        {speaker && (
                            <>
                                <span className={`w-3 h-3 rounded-full ${
                                    speaker.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                                }`} />
                                <span className="text-white text-sm font-medium">
                                    {speaker.name}
                                </span>
                            </>
                        )}
                        {source.type === 'hls' && (
                            <span className="px-1 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                                CANLI
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                        <button
                            onClick={onPin}
                            className={`p-1.5 rounded ${
                                isPinned 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                            title="Sabitle"
                        >
                            📌
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded bg-white/20 text-white hover:bg-red-500"
                            title="Kapat"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </Rnd>
    );
}
```

### E. Pinned Widgets Store

```typescript
// store/pinnedWidgetsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinnedWidget {
    id: string;
    type: 'stream' | 'screenshare';
    sourceId: string;          // streamId veya odaklanılan kullanıcı ID
    position: { x: number; y: number };
    size: { width: number; height: number };
}

interface PinnedWidgetsStore {
    widgets: PinnedWidget[];
    pinWidget: (widget: PinnedWidget) => void;
    unpinWidget: (id: string) => void;
    updatePosition: (id: string, pos: { x: number; y: number }) => void;
}

export const usePinnedWidgets = create<PinnedWidgetsStore>()(
    persist(
        (set) => ({
            widgets: [],
            pinWidget: (widget) => set((s) => ({ 
                widgets: [...s.widgets, widget] 
            })),
            unpinWidget: (id) => set((s) => ({ 
                widgets: s.widgets.filter((w) => w.id !== id) 
            })),
            updatePosition: (id, pos) => set((s) => ({
                widgets: s.widgets.map((w) => 
                    w.id === id ? { ...w, position: pos } : w
                )
            })),
        }),
        { name: 'xc-pinned-widgets' }
    )
);
```

### F. Performans Optimizasyonu

| Teknik | Açıklama | Etki |
|:---|:---|:---|
| **Hardware Acceleration** | Tauri WebView GPU işleme | CPU yükü -%50 |
| **ABR Auto-Downgrade** | Widget < 400px → 360p | Bant genişliği -%70 |
| **Lazy Decode** | Görünür olmayan widgetlar pause | RAM -%30 |
| **FPS Limiter** | CSS `will-change` optimizasyonu | GPU paylaşımı |

### G. Rust Entegrasyonu: Ghost Mode Toggle

```rust
// src-tauri/src/overlay.rs
#[tauri::command]
fn enter_ghost_mode(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_window("overlay") {
        // 1. Arka planı şeffaf yap
        overlay.eval("document.body.classList.add('ghost-mode')").ok();
        
        // 2. Click-through aktif et
        #[cfg(target_os = "windows")]
        set_click_through(&overlay, true);
        
        // 3. Sadece pinlenmiş widgetları göster
        overlay.eval("window.__XC_GHOST_MODE = true").ok();
    }
}

#[tauri::command]
fn exit_ghost_mode(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_window("overlay") {
        #[cfg(target_os = "windows")]
        set_click_through(&overlay, false);
        
        overlay.eval("document.body.classList.remove('ghost-mode')").ok();
        overlay.eval("window.__XC_GHOST_MODE = false").ok();
        overlay.set_focus().ok();
    }
}
```

---

## 6. Yol Haritası

### Faz 1: Temel Overlay Altyapısı (Tamamlandı ✅)

| Görev | Açıklama | Durum |
|:---|:---|:---|
| Multi-window setup | Overlay penceresi oluşturma | ✅ Tamamlandı (`lib.rs`) |
| Global shortcut | Shift+Tab toggle | ✅ Tamamlandı |
| Transparent window | Şeffaf, çerçevesiz overlay | ✅ Tamamlandı |
| Overlay entry point | React overlay app | ✅ Tamamlandı (`OverlayApp.tsx`) |

### Faz 2: Temel Widgetlar (Tamamlandı ✅)

| Widget | Fonksiyon | Durum |
|:---|:---|:---|
| **FriendsWidget** | Online arkadaşlar, DM başlatma | ✅ Tamamlandı (Real API) |
| **ChatWidget** | Aktif sunucudan son mesajlar | ✅ Tamamlandı (Real API) |
| **VoiceWidget** | Mute/Deafen kontrolü | ✅ Tamamlandı (Real Store) |

### Faz 3: PiP Video Widgetlar (Tamamlandı ✅)

| Görev | Açıklama | Durum |
|:---|:---|:---|
| **UniversalVideoWidget** | HLS + WebRTC unified player | ✅ Tamamlandı (HTML5 Demo) |
| **react-rnd entegrasyonu** | Drag & resize | ✅ Tamamlandı |
| **PinnedWidgetsStore** | Zustand persistent state | ✅ Tamamlandı |
| **ABR kalite kontrolü** | Boyuta göre otomatik kalite | 🟡 Sonraki Aşama |

### Faz 4: Ghost Mode (Tamamlandı ✅)

| Görev | Açıklama | Durum |
|:---|:---|:---|
| **Click-through Win32** | WS_EX_TRANSPARENT toggle | ✅ Tamamlandı |
| **Ghost CSS class** | Opacity ve pointer-events | ✅ Tamamlandı |
| **Pin/Unpin logic** | Widget sabitleme | ✅ Tamamlandı (BaseWidget) |

### Faz 5: Polish & Features (Tamamlandı ✅)

| Özellik | Açıklama | Durum |
|:---|:---|:---|
| **Animasyonlar** | Slide-in/out, blur efektleri | ✅ Tamamlandı (Scale + Fade) |
| **Tema Sistemi** | Oyun bazlı temalar | 🟡 Planlanıyor |
| **Keyboard Navigation** | Tam gamepad/klavye desteği | 🟡 Planlanıyor |
| **Visual Polish** | Glassmorphism, Animations | ✅ Tamamlandı |
| **Code Refactor** | BaseWidget Implementation | ✅ Tamamlandı |

---

## 7. Tauri Yapılandırma Değişiklikleri

### tauri.conf.json Güncellemesi

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "XC",
        "width": 1200,
        "height": 800
      },
      {
        "label": "overlay",
        "title": "XC Overlay",
        "url": "overlay.html",
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visible": false,
        "fullscreen": true
      }
    ]
  },
  "plugins": {
    "global-shortcut": {}
  }
}
```

---

## 8. Risk Analizi

| Risk | Etki | Çözüm |
|:---|:---|:---|
| Anti-Cheat algılama | Yüksek | Top-most window (hooking yok) |
| Performans etkisi | Orta | Lazy rendering, GPU acceleration, ABR |
| Input delay | Orta | Direct Win32 API kullanımı |
| Video decode CPU yükü | Orta | Hardware acceleration + auto-downgrade |

---

## 9. Sonuç

XC'nin mevcut Tauri + React mimarisi, Xbox Game Bar benzeri bir overlay için **mükemmel bir temel** sunuyor:

✅ **Avantajlar:**
- Tauri zaten multi-window destekliyor
- Global shortcut plugin mevcut
- LiveKit voice chat hazır
- React component altyapısı hazır

⚠️ **Yapılması Gerekenler:**
1. Overlay penceresi oluşturma (Rust)
2. Click-through mode (Win32 API)
3. Game detection service
4. Overlay React uygulaması
5. **🎯 PiP Video Widgets (Killer Feature)**

> [!TIP]
> Discord'un overlay sistemi de benzer bir yaklaşım kullanıyor. Farkı: Discord C++ kullanırken, XC Tauri/Rust kullanacak - bu daha güvenli ve modern bir çözüm.

> [!IMPORTANT]
> **PiP over Game** özelliği XC'yi Discord ve Game Bar'dan ayıran USP (Unique Selling Point) olacaktır. Oyuncuların en büyük hayali: grind yaparken arkadaşın ekranını veya turnuva yayınını Alt-Tab yapmadan izlemek.

