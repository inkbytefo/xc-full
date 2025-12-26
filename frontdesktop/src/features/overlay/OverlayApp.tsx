import { useState, useEffect } from 'react';
import { ActionBar } from './layout/ActionBar';
import { FriendsWidget } from './widgets/FriendsWidget';
import { ChatWidget } from './widgets/ChatWidget';
import { VoiceWidget } from './widgets/VoiceWidget';
import { UniversalVideoWidget } from './widgets/UniversalVideoWidget';
import { ServerWidget } from './widgets/ServerWidget';
import { ToastProvider } from './NotificationToast';
import { useOverlayMode } from './hooks/useOverlayMode';
import { useOverlaySettings } from './stores/overlaySettingsStore';
import { OverlaySettingsModal } from './OverlaySettingsModal';

export function OverlayApp() {
    const { pinnedView } = useOverlayMode();
    const {
        showHints,
        keybindings,
        overlayBackdropOpacity,
        pinnedWidgetOpacity,
        blurStrength
    } = useOverlaySettings();
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Dynamic styles based on settings
    const overlayStyle = {
        '--overlay-backdrop-opacity': overlayBackdropOpacity,
        '--pinned-widget-bg-opacity': pinnedWidgetOpacity,
        '--overlay-blur': `${blurStrength}px`
    } as React.CSSProperties;

    // Sync shortcuts on startup
    useEffect(() => {
        useOverlaySettings.getState().syncShortcuts();
    }, []);

    const appClass = pinnedView ? 'overlay-app pinned-view' : 'overlay-app';

    return (
        <ToastProvider>
            <div className={appClass} style={overlayStyle}>

                {/* Floating draggable Action Bar */}
                {!pinnedView && (
                    <ActionBar onSettingsClick={() => setSettingsOpen(true)} />
                )}

                {/* Free-form Widget Area */}
                {/* Widgets manage their own visibility (open/closed) and pinned state via widgetStore */}
                {/* Quick chat is handled inside ChatWidget/ChatView */}
                <ServerWidget />
                <FriendsWidget />
                <ChatWidget />
                <VoiceWidget />
                <UniversalVideoWidget />

                {/* Footer */}
                {!pinnedView && showHints && (
                    <footer className="overlay-footer">
                        <kbd>{keybindings.toggleOverlay.display.split(' + ').map((k, i) => (
                            <span key={i}>{i > 0 ? ' + ' : ''}{k}</span>
                        ))}</kbd> tuşlarına basarak oyuna dönebilirsiniz • Ayarları değiştirmek için <kbd>⚙️</kbd> butonuna tıklayın
                    </footer>
                )}

                <OverlaySettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                />
            </div>
        </ToastProvider>
    );
}
