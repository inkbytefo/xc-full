// ============================================================================
// Overlay Settings Store - Persistent Settings with Keybindings
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface KeyBinding {
    key: string;           // Display key (e.g. "A", "Tab")
    code: string;          // Raw code for backend (e.g. "KeyA", "Tab")
    modifiers: string[];   // Modifiers (e.g., ["Shift"], ["Ctrl", "Alt"])
    display: string;       // Human readable display (e.g., "Shift + Tab")
}

import { invoke } from '@tauri-apps/api/core';

export interface OverlaySettings {
    // Keybindings
    keybindings: {
        toggleOverlay: KeyBinding;
        toggleGhostMode: KeyBinding;
        toggleManageMode: KeyBinding;
    };

    // Appearance
    overlayOpacity: number;          // 0.0 - 1.0 (Widget opacity in active mode)
    overlayBackdropOpacity: number;  // 0.0 - 1.0 (Background opacity in active mode)
    pinnedWidgetOpacity: number;     // 0.0 - 1.0 (Widget opacity in ghost mode)
    blurStrength: number;            // 0 - 20 (px)
    widgetAnimations: boolean;
    compactMode: boolean;

    // Behavior
    autoHideOnGame: boolean;
    showHints: boolean;
    rememberWidgetPositions: boolean;

    // Voice
    pushToTalk: boolean;
    pushToTalkKey: KeyBinding;
}

interface OverlaySettingsStore extends OverlaySettings {
    // Actions
    setKeybinding: (action: keyof OverlaySettings['keybindings'], binding: KeyBinding) => void;
    setPushToTalkKey: (binding: KeyBinding) => void;
    setOverlayOpacity: (opacity: number) => void;
    setOverlayBackdropOpacity: (opacity: number) => void;
    setPinnedWidgetOpacity: (opacity: number) => void;
    setBlurStrength: (blur: number) => void;
    setWidgetAnimations: (enabled: boolean) => void;
    setCompactMode: (enabled: boolean) => void;
    setAutoHideOnGame: (enabled: boolean) => void;
    setShowHints: (enabled: boolean) => void;
    setRememberWidgetPositions: (enabled: boolean) => void;
    setPushToTalk: (enabled: boolean) => void;
    resetToDefaults: () => void;

    // Sync
    syncShortcuts: () => Promise<void>;
}

// Default keybindings
const defaultSettings: OverlaySettings = {
    keybindings: {
        toggleOverlay: {
            key: 'Tab',
            code: 'Tab',
            modifiers: ['Shift'],
            display: 'Shift + Tab'
        },
        toggleGhostMode: {
            key: 'G',
            code: 'KeyG',
            modifiers: ['Shift'],
            display: 'Shift + G'
        },
        toggleManageMode: {
            key: 'M',
            code: 'KeyM',
            modifiers: ['Shift'],
            display: 'Shift + M'
        }
    },
    overlayOpacity: 1.0,           // Widgets are fully opaque by default in active mode
    overlayBackdropOpacity: 0.85,  // Default dark/opaque background (as requested)
    pinnedWidgetOpacity: 0.0,      // Fully transparent background in ghost mode (only content visible)
    blurStrength: 8,               // Nice blur default
    widgetAnimations: true,
    compactMode: false,
    autoHideOnGame: false,
    showHints: true,
    rememberWidgetPositions: true,
    pushToTalk: false,
    pushToTalkKey: {
        key: 'V',
        code: 'KeyV',
        modifiers: [],
        display: 'V'
    }
};

// Start of Helper functions replacment
export function createKeyBindingDisplay(key: string, modifiers: string[]): string {
    const parts = [...modifiers, key];
    return parts.join(' + ');
}

// Helper to parse keyboard event to KeyBinding
export function keyEventToBinding(event: KeyboardEvent): KeyBinding | null {
    // Ignore modifier-only presses
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
        return null;
    }

    const modifiers: string[] = [];
    if (event.shiftKey) modifiers.push('Shift');
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.metaKey) modifiers.push('Meta');

    const code = event.code;
    const key = code.replace('Key', '').replace('Digit', '');

    return {
        key,
        code,
        modifiers,
        display: createKeyBindingDisplay(key, modifiers)
    };
}

export const useOverlaySettings = create<OverlaySettingsStore>()(
    persist(
        (set, get) => ({
            ...defaultSettings,

            setKeybinding: (action, binding) => {
                set((state) => ({
                    keybindings: {
                        ...state.keybindings,
                        [action]: binding
                    }
                }));
                const cmd =
                    action === 'toggleOverlay'
                        ? 'update_overlay_shortcut'
                        : action === 'toggleGhostMode'
                            ? 'update_ghost_mode_shortcut'
                            : action === 'toggleManageMode'
                                ? 'update_manage_mode_shortcut'
                                : null;

                if (!cmd) return;

                invoke(cmd, {
                    key: binding.code,
                    modifiers: binding.modifiers
                }).catch(console.error);
            },

            setPushToTalkKey: (binding) =>
                set({ pushToTalkKey: binding }),

            setOverlayOpacity: (opacity) =>
                set({ overlayOpacity: Math.max(0.1, Math.min(1, opacity)) }),

            setOverlayBackdropOpacity: (opacity) =>
                set({ overlayBackdropOpacity: Math.max(0, Math.min(1, opacity)) }),

            setPinnedWidgetOpacity: (opacity) =>
                set({ pinnedWidgetOpacity: Math.max(0, Math.min(1, opacity)) }),

            setBlurStrength: (blur) =>
                set({ blurStrength: Math.max(0, Math.min(20, blur)) }),

            setWidgetAnimations: (enabled) =>
                set({ widgetAnimations: enabled }),

            setCompactMode: (enabled) =>
                set({ compactMode: enabled }),

            setAutoHideOnGame: (enabled) =>
                set({ autoHideOnGame: enabled }),

            setShowHints: (enabled) =>
                set({ showHints: enabled }),

            setRememberWidgetPositions: (enabled) =>
                set({ rememberWidgetPositions: enabled }),

            setPushToTalk: (enabled) =>
                set({ pushToTalk: enabled }),

            resetToDefaults: () => {
                set(defaultSettings);
                const overlayBinding = defaultSettings.keybindings.toggleOverlay;
                invoke('update_overlay_shortcut', {
                    key: overlayBinding.code,
                    modifiers: overlayBinding.modifiers
                }).catch(console.error);

                const ghostBinding = defaultSettings.keybindings.toggleGhostMode;
                invoke('update_ghost_mode_shortcut', {
                    key: ghostBinding.code,
                    modifiers: ghostBinding.modifiers
                }).catch(console.error);

                const manageBinding = defaultSettings.keybindings.toggleManageMode;
                invoke('update_manage_mode_shortcut', {
                    key: manageBinding.code,
                    modifiers: manageBinding.modifiers
                }).catch(console.error);
            },

            syncShortcuts: async () => {
                const state = get();
                try {
                    await invoke('update_overlay_shortcut', {
                        key: state.keybindings.toggleOverlay.code,
                        modifiers: state.keybindings.toggleOverlay.modifiers
                    });
                    await invoke('update_ghost_mode_shortcut', {
                        key: state.keybindings.toggleGhostMode.code,
                        modifiers: state.keybindings.toggleGhostMode.modifiers
                    });
                    await invoke('update_manage_mode_shortcut', {
                        key: state.keybindings.toggleManageMode.code,
                        modifiers: state.keybindings.toggleManageMode.modifiers
                    });
                } catch (e) {
                    console.error('Failed to sync shortcuts:', e);
                }
            }
        }),
        {
            name: 'xc-overlay-settings',
            version: 1
        }
    )
);
