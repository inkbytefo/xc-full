// ============================================================================
// useMediaSession Hook - Convenient wrapper for mediaSessionStore
// ============================================================================

import { useCallback } from "react";
import { useMediaSessionStore } from "../../../store/mediaSessionStore";
import type {
    SessionType,
    SessionContext,
    MediaControls,
    PiPState,
    Participant,
    IncomingCall,
    ConnectionStatus,
} from "../../../store/mediaSessionStore";

// Re-export types for convenience
export type {
    SessionType,
    SessionContext,
    MediaControls,
    PiPState,
    Participant,
    IncomingCall,
    ConnectionStatus,
};

/**
 * Main hook for accessing media session state and actions
 */
export function useMediaSession() {
    const store = useMediaSessionStore();

    // Computed values
    const isActive = store.sessionType !== "idle";
    const isVoiceSession = ["dm-voice", "dm-video", "server-voice", "server-video"].includes(
        store.sessionType
    );
    const isViewingContent = ["live-stream", "screen-share"].includes(store.sessionType);
    const hasIncomingCalls = store.incomingCalls.length > 0;

    return {
        // State
        sessionType: store.sessionType,
        context: store.context,
        connection: store.connection,
        media: store.media,
        participants: store.participants,
        localParticipant: store.localParticipant,
        pip: store.pip,
        incomingCalls: store.incomingCalls,
        error: store.error,

        // Computed
        isActive,
        isVoiceSession,
        isViewingContent,
        hasIncomingCalls,
        isConnected: store.connection === "connected",
        isConnecting: store.connection === "connecting",

        // Actions
        startDMCall: store.startDMCall,
        joinServerChannel: store.joinServerChannel,
        watchLiveStream: store.watchLiveStream,
        watchScreenShare: store.watchScreenShare,
        endSession: store.endSession,

        // Media controls
        toggleMute: store.toggleMute,
        toggleDeafen: store.toggleDeafen,
        toggleCamera: store.toggleCamera,
        toggleScreenShare: store.toggleScreenShare,

        // PiP controls
        enablePiP: store.enablePiP,
        disablePiP: store.disablePiP,
        updatePiPPosition: store.updatePiPPosition,
        updatePiPSize: store.updatePiPSize,

        // Incoming calls
        receiveIncomingCall: store.receiveIncomingCall,
        acceptCall: store.acceptCall,
        rejectCall: store.rejectCall,
    };
}

/**
 * Hook for just the incoming calls queue
 */
export function useIncomingCalls() {
    const incomingCalls = useMediaSessionStore((s) => s.incomingCalls);
    const acceptCall = useMediaSessionStore((s) => s.acceptCall);
    const rejectCall = useMediaSessionStore((s) => s.rejectCall);

    return {
        calls: incomingCalls,
        hasIncoming: incomingCalls.length > 0,
        firstCall: incomingCalls[0] ?? null,
        accept: acceptCall,
        reject: rejectCall,
    };
}

/**
 * Hook for PiP state and controls
 */
export function usePiP() {
    const pip = useMediaSessionStore((s) => s.pip);
    const enablePiP = useMediaSessionStore((s) => s.enablePiP);
    const disablePiP = useMediaSessionStore((s) => s.disablePiP);
    const updatePosition = useMediaSessionStore((s) => s.updatePiPPosition);
    const updateSize = useMediaSessionStore((s) => s.updatePiPSize);

    const toggle = useCallback(() => {
        if (pip.enabled) {
            disablePiP();
        } else {
            enablePiP();
        }
    }, [pip.enabled, enablePiP, disablePiP]);

    return {
        ...pip,
        toggle,
        enable: enablePiP,
        disable: disablePiP,
        updatePosition,
        updateSize,
    };
}

/**
 * Hook for media controls only
 */
export function useMediaControls() {
    const media = useMediaSessionStore((s) => s.media);
    const toggleMute = useMediaSessionStore((s) => s.toggleMute);
    const toggleDeafen = useMediaSessionStore((s) => s.toggleDeafen);
    const toggleCamera = useMediaSessionStore((s) => s.toggleCamera);
    const toggleScreenShare = useMediaSessionStore((s) => s.toggleScreenShare);

    return {
        ...media,
        toggleMute,
        toggleDeafen,
        toggleCamera,
        toggleScreenShare,
    };
}

/**
 * Hook that returns true if there's an active session
 */
export function useHasActiveSession() {
    return useMediaSessionStore((s) => s.sessionType !== "idle");
}

/**
 * Hook for just the session context
 */
export function useSessionContext() {
    const sessionType = useMediaSessionStore((s) => s.sessionType);
    const context = useMediaSessionStore((s) => s.context);
    const connection = useMediaSessionStore((s) => s.connection);

    return {
        sessionType,
        context,
        connection,
        isIdle: sessionType === "idle",
    };
}
