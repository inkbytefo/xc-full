import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BackgroundTheme = "dotwave" | "topo" | "neongrid";

interface UIState {
    backgroundTheme: BackgroundTheme;
    setBackgroundTheme: (theme: BackgroundTheme) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            backgroundTheme: "dotwave",
            setBackgroundTheme: (theme) => set({ backgroundTheme: theme }),
        }),
        {
            name: "xcord-ui",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
