// ============================================================================
// GlobalVoiceSessionModal - Voice Session Indicator
// ============================================================================
// This component shows when user has an active voice/video session
// and has navigated away from the session page.
// 
// Note: This is now a thin wrapper around ActiveSessionOverlay from
// the media-session feature, which provides the full implementation.
// ============================================================================

import { ActiveSessionOverlay } from "../../media-session/components/ActiveSessionOverlay";

/**
 * Global voice session modal that appears when in an active session
 * but navigated away from the session page.
 */
export function GlobalVoiceSessionModal() {
    return <ActiveSessionOverlay />;
}
