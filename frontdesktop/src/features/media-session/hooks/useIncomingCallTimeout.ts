// ============================================================================
// useIncomingCallTimeout Hook - Auto-cleanup for incoming call queue
// ============================================================================

import { useEffect } from "react";
import { useMediaSessionStore } from "../../../store/mediaSessionStore";

const CLEANUP_INTERVAL_MS = 1000; // Check every second

/**
 * Hook that automatically cleans up expired incoming calls.
 * Should be mounted once at the app root level.
 */
export function useIncomingCallTimeout() {
    const cleanupExpiredCalls = useMediaSessionStore((s) => s.cleanupExpiredCalls);
    const incomingCalls = useMediaSessionStore((s) => s.incomingCalls);

    useEffect(() => {
        // Only run cleanup if there are pending calls
        if (incomingCalls.length === 0) return;

        const interval = setInterval(() => {
            cleanupExpiredCalls();
        }, CLEANUP_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [incomingCalls.length, cleanupExpiredCalls]);
}

/**
 * Get the remaining time for an incoming call in seconds
 */
export function useCallRemainingTime(callId: string): number {
    const incomingCalls = useMediaSessionStore((s) => s.incomingCalls);
    const call = incomingCalls.find((c) => c.id === callId);

    if (!call) return 0;

    const remaining = Math.max(0, call.expiresAt - Date.now());
    return Math.ceil(remaining / 1000);
}
