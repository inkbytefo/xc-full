import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayApp } from './features/overlay/OverlayApp';
import './index.css';
import './features/overlay/styles/overlay.css';
import { WebSocketProvider } from './lib/websocket/WebSocketProvider';
import { ToastProvider } from './features/overlay/NotificationToast';
import { RealtimeNotifications } from './components/RealtimeNotifications';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

// New media session components
import {
    IncomingCallModal,
    PiPContainer,
    useIncomingCallTimeout,
} from './features/media-session';

function OverlayRoot() {
    const checkAuth = useAuthStore((s) => s.checkAuth);

    useEffect(() => {
        checkAuth().catch(() => { });
    }, [checkAuth]);

    return (
        <WebSocketProvider>
            <ToastProvider>
                <RealtimeNotifications />
                <MediaSessionManager />
                <IncomingCallModal />
                <PiPContainer />
                <OverlayApp />
            </ToastProvider>
        </WebSocketProvider>
    );
}

// Global call timeout cleanup
function MediaSessionManager() {
    useIncomingCallTimeout();
    return null;
}

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
    <React.StrictMode>
        <OverlayRoot />
    </React.StrictMode>
);
