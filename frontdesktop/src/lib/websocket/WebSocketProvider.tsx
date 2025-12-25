// ============================================================================
// WebSocket Provider Component
// ============================================================================

import { useEffect, useRef } from "react";
import { useWebSocketStore } from "./store";
import { useAuthStore } from "../../store/authStore";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    // Tokens are not needed for WebSocket connection (handled by cookies)
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const connect = useWebSocketStore((state) => state.connect);
    const disconnect = useWebSocketStore((state) => state.disconnect);

    // Use ref to prevent StrictMode double invoke issues
    const isConnectingRef = useRef(false);

    useEffect(() => {
        // Prevent double connection in React StrictMode
        if (isConnectingRef.current) return;

        // Check if we already have a client connected or connecting
        const currentStatus = useWebSocketStore.getState().status;
        if (currentStatus === "connected" || currentStatus === "connecting") {
            isConnectingRef.current = true;
            return;
        }

        if (isAuthenticated) {
            isConnectingRef.current = true;
            connect(WS_URL);
        }

        return () => {
            // Only disconnect if we actually connected
            if (isConnectingRef.current) {
                isConnectingRef.current = false;
                // Delay disconnect slightly to handle StrictMode double invoke
                setTimeout(() => {
                    // Check if we're still supposed to be disconnected
                    const currentAuth = useAuthStore.getState().isAuthenticated;
                    if (!currentAuth) {
                        disconnect();
                    }
                }, 100);
            }
        };
    }, [isAuthenticated, connect, disconnect]);

    return <>{children}</>;
}
