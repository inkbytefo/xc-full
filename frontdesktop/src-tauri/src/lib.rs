// XC Overlay - Rust Backend
// Tauri commands for overlay toggle, ghost mode, and game detection

mod overlay;

use overlay::{
    detect_running_game, toggle_overlay, update_overlay_shortcut, OverlayPinnedViewState,
    OverlayShortcutState,
};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(OverlayShortcutState(Mutex::new(None)))
        .manage(OverlayPinnedViewState(Mutex::new(false)))
        .setup(|app| {
            // Create overlay window on startup (hidden)
            let handle = app.handle().clone();

            // Register global shortcut: Shift+Tab
            let shortcut = Shortcut::new(Some(Modifiers::SHIFT), Code::Tab);

            app.global_shortcut()
                .on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_overlay(handle.clone());
                    }
                })?;

            // Store initial shortcut in state
            if let Some(state) = app.try_state::<OverlayShortcutState>() {
                if let Ok(mut s) = state.0.lock() {
                    *s = Some(shortcut);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_overlay,
            detect_running_game,
            update_overlay_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
