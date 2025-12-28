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
                const existing = get().widgets[id];

                const hasValidPosition =
                    !!existing?.position &&
                    typeof existing.position.x === 'number' &&
                    Number.isFinite(existing.position.x) &&
                    typeof existing.position.y === 'number' &&
                    Number.isFinite(existing.position.y);

                const hasValidSize =
                    !!existing?.size &&
                    typeof existing.size.width === 'number' &&
                    Number.isFinite(existing.size.width) &&
                    typeof existing.size.height === 'number' &&
                    Number.isFinite(existing.size.height);

                const normalized: WidgetState = {
                    id,
                    isOpen: typeof existing?.isOpen === 'boolean' ? existing.isOpen : true,
                    isPinned: typeof existing?.isPinned === 'boolean' ? existing.isPinned : false,
                    position: hasValidPosition ? existing!.position : defaultPos,
                    size: hasValidSize ? existing!.size : defaultSize,
                    zIndex: typeof existing?.zIndex === 'number' && Number.isFinite(existing.zIndex) ? existing.zIndex : 1
                };

                if (!existing) {
                    set((s) => ({
                        widgets: {
                            ...s.widgets,
                            [id]: normalized
                        }
                    }));
                    return;
                }

                const needsRepair =
                    existing.id !== normalized.id ||
                    existing.isOpen !== normalized.isOpen ||
                    existing.isPinned !== normalized.isPinned ||
                    !hasValidPosition ||
                    !hasValidSize ||
                    existing.zIndex !== normalized.zIndex;

                if (needsRepair) {
                    set((s) => ({
                        widgets: {
                            ...s.widgets,
                            [id]: normalized
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
