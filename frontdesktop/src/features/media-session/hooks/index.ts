// ============================================================================
// Media Session Hooks - Barrel Export
// ============================================================================

// Main LiveKit room hook
export { useLiveKitRoom } from "./useLiveKitRoom";
export type {
    LiveKitParticipant,
    LiveKitConnectionState,
    UseLiveKitRoomOptions,
    UseLiveKitRoomResult,
} from "./useLiveKitRoom";

// Standalone utilities
export { createRoom, connectToRoom } from "./useLiveKitRoom";

// Media session hooks
export {
    useMediaSession,
    useIncomingCalls,
    usePiP,
    useMediaControls,
    useHasActiveSession,
    useSessionContext,
} from "./useMediaSession";

// Call timeout management
export {
    useIncomingCallTimeout,
    useCallRemainingTime,
} from "./useIncomingCallTimeout";

// PiP drag functionality
export { usePiPDrag } from "./usePiPDrag";
