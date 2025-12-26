// XC Overlay Module
// Handles overlay window management, ghost mode, and game detection

use std::str::FromStr;
use std::sync::Mutex;
use sysinfo::System;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub struct OverlayShortcutState(pub Mutex<Option<Shortcut>>);
pub struct GhostShortcutState(pub Mutex<Option<Shortcut>>);
pub struct OverlayPinnedViewState(pub Mutex<bool>);

fn parse_modifiers(modifiers: Vec<String>) -> Modifiers {
    let mut mods = Modifiers::empty();
    for m in modifiers {
        match m.as_str() {
            "Shift" => mods |= Modifiers::SHIFT,
            "Ctrl" | "Control" => mods |= Modifiers::CONTROL,
            "Alt" => mods |= Modifiers::ALT,
            "Meta" | "Super" | "Command" => mods |= Modifiers::META,
            _ => {}
        }
    }
    mods
}

fn parse_key_code(key: &str) -> Result<Code, String> {
    let raw = key.trim();
    let mut candidates: Vec<String> = Vec::new();

    if !raw.is_empty() {
        candidates.push(raw.to_string());
    }

    if raw.len() == 1 {
        let ch = raw.chars().next().unwrap();
        if ch.is_ascii_alphabetic() {
            candidates.push(format!("Key{}", raw.to_ascii_uppercase()));
        } else if ch.is_ascii_digit() {
            candidates.push(format!("Digit{}", raw));
        }
    }

    if raw.starts_with("Key") && raw.len() == 4 {
        candidates.push(format!("Key{}", raw[3..].to_ascii_uppercase()));
    }

    for candidate in candidates {
        if let Ok(code) = Code::from_str(&candidate) {
            return Ok(code);
        }
    }

    Err(format!("Invalid key code: {}", key))
}

fn set_pinned_view_state(app: &AppHandle, enabled: bool) {
    if let Some(state) = app.try_state::<OverlayPinnedViewState>() {
        if let Ok(mut s) = state.0.lock() {
            *s = enabled;
        }
    }
}

fn get_pinned_view_state(app: &AppHandle) -> bool {
    if let Some(state) = app.try_state::<OverlayPinnedViewState>() {
        if let Ok(s) = state.0.lock() {
            return *s;
        }
    }
    false
}

#[tauri::command]
pub fn update_overlay_shortcut(
    app: AppHandle,
    state: State<'_, OverlayShortcutState>,
    key: String,
    modifiers: Vec<String>,
) -> Result<(), String> {
    let mut current_shortcut = state.0.lock().map_err(|e| e.to_string())?;

    // 1. Unregister old shortcut
    if let Some(old) = *current_shortcut {
        let _ = app.global_shortcut().unregister(old);
    }

    // 2. Parse new shortcut
    let mods = parse_modifiers(modifiers);
    let key_code = parse_key_code(&key)?;

    let new_shortcut = Shortcut::new(Some(mods), key_code);

    // 3. Register new shortcut
    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(new_shortcut, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                toggle_overlay(app_handle.clone());
            }
        })
        .map_err(|e| e.to_string())?;

    *current_shortcut = Some(new_shortcut);

    Ok(())
}

#[tauri::command]
pub fn update_ghost_shortcut(
    app: AppHandle,
    state: State<'_, GhostShortcutState>,
    key: String,
    modifiers: Vec<String>,
) -> Result<(), String> {
    let mut current_shortcut = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(old) = *current_shortcut {
        let _ = app.global_shortcut().unregister(old);
    }

    let mods = parse_modifiers(modifiers);
    let key_code = parse_key_code(&key)?;

    let new_shortcut = Shortcut::new(Some(mods), key_code);

    let app_handle = app.clone();
    app.global_shortcut()
        .on_shortcut(new_shortcut, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                toggle_ghost_mode(app_handle.clone());
            }
        })
        .map_err(|e| e.to_string())?;

    *current_shortcut = Some(new_shortcut);

    Ok(())
}

// Known game processes for auto-detection
const KNOWN_GAMES: &[&str] = &[
    "valorant",
    "valorant-win64-shipping",
    "leagueclient",
    "league of legends",
    "csgo",
    "cs2",
    "gta5",
    "gtav",
    "cyberpunk2077",
    "fortnite",
    "minecraft",
    "rocketleague",
    "overwatch",
    "apex_legends",
    "pubg",
    "dota2",
];

/// Toggle overlay visibility / pinned view.
#[tauri::command]
pub fn toggle_overlay(app: AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        match overlay.is_visible() {
            Ok(false) => {
                let _ = overlay.show();
                let _ = overlay.set_focus();

                #[cfg(target_os = "windows")]
                set_click_through(&overlay, false);

                set_pinned_view_state(&app, false);
                let _ = overlay.eval(
                    "window.__XC_PINNED_VIEW = false; window.dispatchEvent(new Event('overlayPinnedViewChanged'));",
                );
            }
            Ok(true) => {
                #[cfg(target_os = "windows")]
                set_click_through(&overlay, false);

                set_pinned_view_state(&app, false);
                let _ = overlay.eval(
                    "window.__XC_PINNED_VIEW = false; window.dispatchEvent(new Event('overlayPinnedViewChanged'));",
                );
                let _ = overlay.hide();
            }
            Err(_) => {}
        }
    }
}

#[tauri::command]
pub fn toggle_ghost_mode(app: AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let was_visible = overlay.is_visible().unwrap_or(false);
        let pinned_view = get_pinned_view_state(&app);
        let next_pinned = !pinned_view;

        if !was_visible && next_pinned {
            let _ = overlay.show();
        }

        set_pinned_view_state(&app, next_pinned);
        let _ = overlay.eval(&format!(
            "window.__XC_PINNED_VIEW = {}; window.dispatchEvent(new Event('overlayPinnedViewChanged'));",
            if next_pinned { "true" } else { "false" }
        ));

        #[cfg(target_os = "windows")]
        set_click_through(&overlay, next_pinned);

        if was_visible && !next_pinned {
            let _ = overlay.set_focus();
        }
    }
}

/// Detect if a known game is currently running
#[tauri::command]
pub fn detect_running_game() -> Option<String> {
    let sys = System::new_all();

    for process in sys.processes().values() {
        let name = process.name().to_lowercase();
        if KNOWN_GAMES.iter().any(|g| name.contains(g)) {
            return Some(name);
        }
    }
    None
}

/// Windows-specific: Set click-through mode using Win32 API
#[cfg(target_os = "windows")]
fn set_click_through(window: &tauri::WebviewWindow, enabled: bool) {
    extern "system" {
        fn GetWindowLongW(hwnd: isize, index: i32) -> i32;
        fn SetWindowLongW(hwnd: isize, index: i32, value: i32) -> i32;
    }

    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_TRANSPARENT: i32 = 0x00000020;
    const WS_EX_LAYERED: i32 = 0x00080000;

    // Get the HWND from the window
    if let Ok(hwnd) = window.hwnd() {
        let hwnd_raw = hwnd.0 as isize;

        unsafe {
            let mut ex_style = GetWindowLongW(hwnd_raw, GWL_EXSTYLE);

            if enabled {
                // Enable click-through: add WS_EX_TRANSPARENT and WS_EX_LAYERED
                ex_style |= WS_EX_TRANSPARENT;
                ex_style |= WS_EX_LAYERED;
            } else {
                // Disable click-through: remove WS_EX_TRANSPARENT
                ex_style &= !WS_EX_TRANSPARENT;
            }

            SetWindowLongW(hwnd_raw, GWL_EXSTYLE, ex_style);
        }
    }
}
