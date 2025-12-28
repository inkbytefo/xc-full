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

    // Notification sound volume (0-100)
    notificationVolume: number;
    setNotificationVolume: (volume: number) => void;
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

            notificationVolume: 50,
            setNotificationVolume: (volume) => set({ notificationVolume: Math.max(0, Math.min(100, volume)) }),
        }),
        {
            name: "pink-ui",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
