import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BackgroundTheme = "dotwave" | "topo" | "neongrid";

interface UIState {
    backgroundTheme: BackgroundTheme;
    setBackgroundTheme: (theme: BackgroundTheme) => void;

    audioInputDeviceId: string | null;
    setAudioInputDeviceId: (deviceId: string | null) => void;
    audioOutputDeviceId: string | null;
    setAudioOutputDeviceId: (deviceId: string | null) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            backgroundTheme: "dotwave",
            setBackgroundTheme: (theme) => set({ backgroundTheme: theme }),

            audioInputDeviceId: null,
            setAudioInputDeviceId: (deviceId) => set({ audioInputDeviceId: deviceId }),
            audioOutputDeviceId: null,
            setAudioOutputDeviceId: (deviceId) => set({ audioOutputDeviceId: deviceId }),
        }),
        {
            name: "xcord-ui",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
