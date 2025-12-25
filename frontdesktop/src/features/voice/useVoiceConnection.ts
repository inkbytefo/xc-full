import { useVoiceStore } from "../../store/voiceStore";

export function useVoiceConnection() {
    const store = useVoiceStore();

    // Compatibility mapper to return what consumers expect
    return {
        isConnected: store.isConnected,
        isConnecting: store.isConnecting,
        isMuted: store.isMuted,
        isDeafened: store.isDeafened,
        isCameraOn: store.isCameraOn,
        isScreenSharing: store.isScreenSharing,
        error: store.error,
        participants: store.participants,
        localParticipant: store.localParticipant,
        connect: (channel: any) => store.connect(channel),
        disconnect: store.disconnect,
        toggleMute: store.toggleMute,
        toggleDeafen: store.toggleDeafen,
        toggleCamera: store.toggleCamera,
        toggleScreenShare: store.toggleScreenShare,
    };
}
