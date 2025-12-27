// ============================================================================
// Realtime Notifications Component
// ============================================================================
// This component bridges WebSocket events to toast notifications.
// It should be placed inside both ToastProvider and WebSocketProvider.

import { useNotificationToasts } from '../lib/query/useNotificationToasts';

/**
 * Component that activates real-time notification toasts.
 * Renders nothing - just enables the toast functionality.
 */
export function RealtimeNotifications() {
    useNotificationToasts();
    return null;
}
