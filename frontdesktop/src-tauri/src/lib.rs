// Pink Overlay - Rust Backend
// Tauri commands for overlay toggle, ghost mode, game detection, and quick chat

mod overlay;

use overlay::{
    detect_running_game, exit_quick_chat, toggle_ghost_mode, toggle_overlay, toggle_quick_chat,
    update_ghost_shortcut, update_overlay_shortcut, update_quick_chat_shortcut,
    GhostShortcutState, OverlayPinnedViewState, OverlayShortcutState, QuickChatActiveState,
    QuickChatShortcutState,
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
        .manage(GhostShortcutState(Mutex::new(None)))
        .manage(QuickChatShortcutState(Mutex::new(None)))
        .manage(OverlayPinnedViewState(Mutex::new(false)))
        .manage(QuickChatActiveState(Mutex::new(false)))
        .setup(|app| {
            let handle = app.handle().clone();
            let ghost_handle = app.handle().clone();
            let quick_chat_handle = app.handle().clone();

            // Register global shortcut: Shift+Tab for overlay toggle
            let shortcut = Shortcut::new(Some(Modifiers::SHIFT), Code::Tab);
            app.global_shortcut()
                .on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_overlay(handle.clone());
                    }
                })?;

            // Register global shortcut: Shift+P for ghost mode toggle
            let ghost_shortcut = Shortcut::new(Some(Modifiers::SHIFT), Code::KeyP);
            app.global_shortcut()
                .on_shortcut(ghost_shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_ghost_mode(ghost_handle.clone());
                    }
                })?;

            // Register global shortcut: Shift+Enter for quick chat
            let quick_chat_shortcut = Shortcut::new(Some(Modifiers::SHIFT), Code::Enter);
            app.global_shortcut()
                .on_shortcut(quick_chat_shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_quick_chat(quick_chat_handle.clone());
                    }
                })?;

            // Store initial shortcuts in state
            if let Some(state) = app.try_state::<OverlayShortcutState>() {
                if let Ok(mut s) = state.0.lock() {
                    *s = Some(shortcut);
                }
            }
            if let Some(state) = app.try_state::<GhostShortcutState>() {
                if let Ok(mut s) = state.0.lock() {
                    *s = Some(ghost_shortcut);
                }
            }
            if let Some(state) = app.try_state::<QuickChatShortcutState>() {
                if let Ok(mut s) = state.0.lock() {
                    *s = Some(quick_chat_shortcut);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_overlay,
            toggle_ghost_mode,
            toggle_quick_chat,
            exit_quick_chat,
            detect_running_game,
            update_ghost_shortcut,
            update_overlay_shortcut,
            update_quick_chat_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
