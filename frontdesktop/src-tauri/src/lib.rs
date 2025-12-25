// XC Overlay - Rust Backend
// Tauri commands for overlay toggle, ghost mode, and game detection

mod overlay;

use overlay::{
    detect_running_game, enter_ghost_mode, exit_ghost_mode, toggle_ghost_mode, toggle_manage_mode,
    toggle_overlay, update_ghost_mode_shortcut, update_manage_mode_shortcut,
    update_overlay_shortcut, GhostModeShortcutState, ManageModeShortcutState,
    OverlayGhostModeState, OverlayManageModeState, OverlayShortcutState,
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
        .manage(GhostModeShortcutState(Mutex::new(None)))
        .manage(ManageModeShortcutState(Mutex::new(None)))
        .manage(OverlayManageModeState(Mutex::new(false)))
        .manage(OverlayGhostModeState(Mutex::new(false)))
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

            let handle = app.handle().clone();
            let ghost_shortcut = Shortcut::new(Some(Modifiers::SHIFT), Code::KeyG);
            app.global_shortcut()
                .on_shortcut(ghost_shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_ghost_mode(handle.clone());
                    }
                })?;
            if let Some(state) = app.try_state::<GhostModeShortcutState>() {
                if let Ok(mut s) = state.0.lock() {
                    *s = Some(ghost_shortcut);
                }
            }

            let handle = app.handle().clone();
            let manage_shortcut = Shortcut::new(Some(Modifiers::SHIFT), Code::KeyM);
            app.global_shortcut()
                .on_shortcut(manage_shortcut, move |_app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_manage_mode(handle.clone());
                    }
                })?;
            if let Some(state) = app.try_state::<ManageModeShortcutState>() {
                if let Ok(mut s) = state.0.lock() {
                    *s = Some(manage_shortcut);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_overlay,
            enter_ghost_mode,
            exit_ghost_mode,
            toggle_ghost_mode,
            toggle_manage_mode,
            detect_running_game,
            update_overlay_shortcut,
            update_ghost_mode_shortcut,
            update_manage_mode_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
