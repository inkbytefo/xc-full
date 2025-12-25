import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayApp } from './features/overlay/OverlayApp';
import './index.css';
import './features/overlay/styles/overlay.css';
import { WebSocketProvider } from './lib/websocket/WebSocketProvider';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useVoiceStore } from './store/voiceStore';

function OverlayRoot() {
    const checkAuth = useAuthStore((s) => s.checkAuth);

    useEffect(() => {
        checkAuth().catch(() => { });
    }, [checkAuth]);

    return (
        <WebSocketProvider>
            <OverlayApp />
        </WebSocketProvider>
    );
}

useVoiceStore.getState().initRuntime("follower");

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
    <React.StrictMode>
        <OverlayRoot />
    </React.StrictMode>
);
