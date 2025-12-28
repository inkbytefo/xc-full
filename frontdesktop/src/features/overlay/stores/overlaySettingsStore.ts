// ============================================================================
// Overlay Settings Store - Persistent Settings with Keybindings
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface KeyBinding {
    key: string;           // Display key (e.g. "A", "Tab")
    code: string;          // Raw code for backend (e.g. "KeyA", "Tab")
    modifiers: string[];   // Modifiers (e.g., ["Shift"], ["Ctrl", "Alt"])
    display: string;       // Human readable display (e.g., "Shift + Tab")
}

export interface OverlaySettings {
    // Keybindings
    keybindings: {
        toggleOverlay: KeyBinding;
        toggleGhostMode: KeyBinding;
        quickChat: KeyBinding;
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

    // Quick Chat
    quickChatEnabled: boolean;
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
    setQuickChatEnabled: (enabled: boolean) => void;
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
            key: 'P',
            code: 'KeyP',
            modifiers: ['Shift'],
            display: 'Shift + P'
        },
        quickChat: {
            key: 'Enter',
            code: 'Enter',
            modifiers: ['Shift'],
            display: 'Shift + Enter'
        },
    },
    overlayOpacity: 1.0,
    overlayBackdropOpacity: 0.85,
    pinnedWidgetOpacity: 0.0,
    blurStrength: 8,
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
    },
    quickChatEnabled: true,
};

export function createKeyBindingDisplay(key: string, modifiers: string[]): string {
    const parts = [...modifiers, key];
    return parts.join(' + ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}

function safeStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) return fallback;
    const strings = value.filter((v): v is string => typeof v === 'string');
    return strings.length ? strings : fallback;
}

function normalizeKeyBinding(value: unknown, fallback: KeyBinding): KeyBinding {
    if (!isRecord(value)) return fallback;

    const key = safeString(value.key, fallback.key);
    const code = safeString(value.code, fallback.code);
    const modifiers = safeStringArray(value.modifiers, fallback.modifiers);
    const display = safeString(value.display, createKeyBindingDisplay(key, modifiers));

    return { key, code, modifiers, display };
}

function normalizeKeybindings(value: unknown): OverlaySettings['keybindings'] {
    const v = isRecord(value) ? value : {};
    return {
        toggleOverlay: normalizeKeyBinding(v.toggleOverlay, defaultSettings.keybindings.toggleOverlay),
        toggleGhostMode: normalizeKeyBinding(v.toggleGhostMode, defaultSettings.keybindings.toggleGhostMode),
        quickChat: normalizeKeyBinding(v.quickChat, defaultSettings.keybindings.quickChat),
    };
}

function normalizePersistedSettings(value: unknown): Partial<OverlaySettings> {
    if (!isRecord(value)) return {};

    const v = isRecord(value.state) ? value.state : value;

    return {
        keybindings: normalizeKeybindings(v.keybindings),
        overlayOpacity: safeNumber(v.overlayOpacity, defaultSettings.overlayOpacity),
        overlayBackdropOpacity: safeNumber(v.overlayBackdropOpacity, defaultSettings.overlayBackdropOpacity),
        pinnedWidgetOpacity: safeNumber(v.pinnedWidgetOpacity, defaultSettings.pinnedWidgetOpacity),
        blurStrength: safeNumber(v.blurStrength, defaultSettings.blurStrength),
        widgetAnimations: safeBoolean(v.widgetAnimations, defaultSettings.widgetAnimations),
        compactMode: safeBoolean(v.compactMode, defaultSettings.compactMode),
        autoHideOnGame: safeBoolean(v.autoHideOnGame, defaultSettings.autoHideOnGame),
        showHints: safeBoolean(v.showHints, defaultSettings.showHints),
        rememberWidgetPositions: safeBoolean(v.rememberWidgetPositions, defaultSettings.rememberWidgetPositions),
        pushToTalk: safeBoolean(v.pushToTalk, defaultSettings.pushToTalk),
        pushToTalkKey: normalizeKeyBinding(v.pushToTalkKey, defaultSettings.pushToTalkKey),
        quickChatEnabled: safeBoolean(v.quickChatEnabled, defaultSettings.quickChatEnabled),
    };
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
                // Determine the correct backend command
                let command = 'update_overlay_shortcut';
                if (action === 'toggleGhostMode') {
                    command = 'update_ghost_shortcut';
                } else if (action === 'quickChat') {
                    command = 'update_quick_chat_shortcut';
                }
                invoke(command, { key: binding.code, modifiers: binding.modifiers }).catch(console.error);
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

            setQuickChatEnabled: (enabled) =>
                set({ quickChatEnabled: enabled }),

            resetToDefaults: () => {
                set(defaultSettings);
                const overlayBinding = defaultSettings.keybindings.toggleOverlay;
                const ghostBinding = defaultSettings.keybindings.toggleGhostMode;
                const quickChatBinding = defaultSettings.keybindings.quickChat;
                invoke('update_overlay_shortcut', { key: overlayBinding.code, modifiers: overlayBinding.modifiers }).catch(console.error);
                invoke('update_ghost_shortcut', { key: ghostBinding.code, modifiers: ghostBinding.modifiers }).catch(console.error);
                invoke('update_quick_chat_shortcut', { key: quickChatBinding.code, modifiers: quickChatBinding.modifiers }).catch(console.error);
            },

            syncShortcuts: async () => {
                const state = get();
                try {
                    await invoke('update_overlay_shortcut', {
                        key: state.keybindings.toggleOverlay.code,
                        modifiers: state.keybindings.toggleOverlay.modifiers
                    });
                    await invoke('update_ghost_shortcut', {
                        key: state.keybindings.toggleGhostMode.code,
                        modifiers: state.keybindings.toggleGhostMode.modifiers
                    });
                    await invoke('update_quick_chat_shortcut', {
                        key: state.keybindings.quickChat.code,
                        modifiers: state.keybindings.quickChat.modifiers
                    });
                } catch (e) {
                    console.error('Failed to sync shortcuts:', e);
                }
            }
        }),
        {
            name: 'pink-overlay-settings',
            version: 6, // Bumped version for Shift+Enter quick chat
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...normalizePersistedSettings(persistedState),
            }),
            migrate: (persistedState) => normalizePersistedSettings(persistedState) as OverlaySettingsStore,
        }
    )
);
