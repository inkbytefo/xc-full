import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetState {
    id: string;
    isOpen: boolean;
    isPinned: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
}

interface WidgetStore {
    widgets: Record<string, WidgetState>;
    activeZIndex: number;

    // Actions
    registerWidget: (id: string, defaultPos: { x: number, y: number }, defaultSize: { width: number, height: number }) => void;
    openWidget: (id: string) => void;
    closeWidget: (id: string) => void;
    toggleWidget: (id: string) => void;
    togglePin: (id: string) => void;
    updatePosition: (id: string, pos: { x: number; y: number }) => void;
    updateSize: (id: string, size: { width: number; height: number }) => void;
    bringToFront: (id: string) => void;
    resetLayout: () => void;
}

export const useWidgetStore = create<WidgetStore>()(
    persist(
        (set, get) => ({
            widgets: {},
            activeZIndex: 100,

            registerWidget: (id, defaultPos, defaultSize) => {
                const state = get().widgets[id];
                if (!state) {
                    set((s) => ({
                        widgets: {
                            ...s.widgets,
                            [id]: {
                                id,
                                isOpen: true, // Default open for main widgets
                                isPinned: false,
                                position: defaultPos,
                                size: defaultSize,
                                zIndex: 1
                            }
                        }
                    }));
                }
            },

            openWidget: (id) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], isOpen: true }
                }
            })),

            closeWidget: (id) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], isOpen: false }
                }
            })),

            togglePin: (id) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], isPinned: !state.widgets[id].isPinned }
                }
            })),

            toggleWidget: (id) => set((state) => {
                const widget = state.widgets[id];
                const isOpen = widget?.isOpen ?? false;
                return {
                    widgets: {
                        ...state.widgets,
                        [id]: { ...widget, isOpen: !isOpen }
                    }
                };
            }),

            updatePosition: (id, pos) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], position: pos }
                }
            })),

            updateSize: (id, size) => set((state) => ({
                widgets: {
                    ...state.widgets,
                    [id]: { ...state.widgets[id], size }
                }
            })),

            bringToFront: (id) => set((state) => {
                const newZ = state.activeZIndex + 1;
                return {
                    activeZIndex: newZ,
                    widgets: {
                        ...state.widgets,
                        [id]: { ...state.widgets[id], zIndex: newZ }
                    }
                };
            }),

            resetLayout: () => set({ widgets: {}, activeZIndex: 100 })
        }),
        {
            name: 'pink-widget-layout',
            version: 1,
        }
    )
);
