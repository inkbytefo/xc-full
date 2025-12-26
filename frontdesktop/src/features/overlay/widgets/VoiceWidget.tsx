// ============================================================================
// Voice Widget - Overlay Ses Kontrol Çubuğu (Compact Bar Design)
// Sesli sohbete bağlıyken otomatik açılır, ayrılınca kapanır
// Sadece overlay açıkken görünür
// ============================================================================

import { useEffect, useState, useRef } from 'react';
import { useVoiceStore } from '../../../store/voiceStore';
import { useWidgetStore } from '../stores/widgetStore';
import { useOverlayMode } from '../hooks/useOverlayMode';
import { Rnd } from 'react-rnd';
import {
    HeadphonesIcon,
    HeadphonesOffIcon,
    MicIcon,
    MicOffIcon,
    PhoneOffIcon,
    ScreenShareIcon,
    SettingsIcon
} from '../../servers/components/Icons';

// Signal bars icon
const SignalIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="16" width="4" height="6" rx="1" />
        <rect x="8" y="12" width="4" height="10" rx="1" />
        <rect x="14" y="8" width="4" height="14" rx="1" />
        <rect x="20" y="4" width="4" height="18" rx="1" opacity="0.3" />
    </svg>
);

// Chevron icons
const ChevronDownIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

interface AudioDevice {
    deviceId: string;
    label: string;
}

export function VoiceWidget() {
    const { pinnedView } = useOverlayMode();
    const {
        isConnected,
        isMuted,
        isDeafened,
        isScreenSharing,
        toggleMute,
        toggleDeafen,
        toggleScreenShare,
        disconnect,
        participants,
        activeChannel,
        ownerAvailable
    } = useVoiceStore();

    const { widgets, openWidget, closeWidget, updatePosition, registerWidget } = useWidgetStore();
    const widgetState = widgets['voice'];

    // Settings dropdown state
    const [showSettings, setShowSettings] = useState(false);
    const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
    const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
    const [selectedInput, setSelectedInput] = useState<string>('default');
    const [selectedOutput, setSelectedOutput] = useState<string>('default');
    const settingsRef = useRef<HTMLDivElement>(null);

    // Register widget with default position
    useEffect(() => {
        registerWidget('voice', { x: window.innerWidth / 2 - 200, y: window.innerHeight - 120 }, { width: 400, height: 100 });
    }, [registerWidget]);

    // Auto open/close based on connection state
    useEffect(() => {
        if (isConnected && !widgetState?.isOpen) {
            openWidget('voice');
        } else if (!isConnected && widgetState?.isOpen) {
            closeWidget('voice');
        }
    }, [isConnected, widgetState?.isOpen, openWidget, closeWidget]);

    // Load audio devices
    useEffect(() => {
        const loadDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const inputs = devices
                    .filter(d => d.kind === 'audioinput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `Mikrofon ${d.deviceId.slice(0, 5)}` }));
                const outputs = devices
                    .filter(d => d.kind === 'audiooutput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `Hoparlör ${d.deviceId.slice(0, 5)}` }));

                setInputDevices(inputs);
                setOutputDevices(outputs);
            } catch (e) {
                console.error('Failed to load audio devices:', e);
            }
        };

        if (showSettings) {
            loadDevices();
        }
    }, [showSettings]);

    // Close settings dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };

        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showSettings]);

    // Don't render if overlay is in ghost/pinned mode
    if (pinnedView) {
        return null;
    }

    // Don't render if not connected or widget is closed
    if (!isConnected || !widgetState?.isOpen) {
        return null;
    }

    const controlsDisabled = !ownerAvailable;
    const currentUser = participants.find(p => p.isLocal);
    const position = widgetState?.position || { x: window.innerWidth / 2 - 200, y: window.innerHeight - 120 };

    return (
        <Rnd
            position={position}
            size={{ width: 400, height: 'auto' }}
            onDragStop={(_e, d) => {
                updatePosition('voice', { x: d.x, y: d.y });
            }}
            dragHandleClassName="voice-bar-handle"
            bounds="window"
            enableResizing={false}
            style={{ zIndex: 9998 }}
        >
            <div
                className="voice-bar-handle"
                style={{
                    background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.98) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    overflow: 'visible',
                    cursor: 'grab',
                    position: 'relative'
                }}
            >
                {/* Top Section - Connection Status */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <SignalIcon className="w-4 h-4 text-green-400" />
                        <div>
                            <div style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#4ade80',
                                lineHeight: 1.2
                            }}>
                                Voice Connected
                            </div>
                            <div style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.5)',
                                lineHeight: 1.2
                            }}>
                                {activeChannel?.name || 'Voice Channel'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Screen Share Button */}
                        <button
                            onClick={() => void toggleScreenShare()}
                            disabled={controlsDisabled}
                            style={{
                                background: isScreenSharing ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: isScreenSharing ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)',
                                borderRadius: 8,
                                padding: 8,
                                cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                                color: isScreenSharing ? '#4ade80' : 'rgba(255,255,255,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                opacity: controlsDisabled ? 0.5 : 1
                            }}
                            title={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                        >
                            <ScreenShareIcon className="w-4 h-4" />
                        </button>

                        {/* Disconnect Button */}
                        <button
                            onClick={disconnect}
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 8,
                                padding: 8,
                                cursor: 'pointer',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                            }}
                            title="Bağlantıyı Kes"
                        >
                            <PhoneOffIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Bottom Section - User & Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px'
                }}>
                    {/* Current User */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#fff',
                            position: 'relative'
                        }}>
                            {currentUser?.identity?.[0]?.toUpperCase() || '?'}

                            {/* Online indicator */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#22c55e',
                                border: '2px solid rgba(20, 20, 25, 1)'
                            }} />
                        </div>
                        <div style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.8)'
                        }}>
                            {currentUser?.identity || 'You'}
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Mute Button */}
                        <button
                            onClick={() => void toggleMute()}
                            disabled={controlsDisabled}
                            style={{
                                background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                                border: '1px solid',
                                borderColor: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)',
                                borderRadius: 10,
                                padding: 10,
                                cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                                color: isMuted ? '#f87171' : 'rgba(255,255,255,0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                opacity: controlsDisabled ? 0.5 : 1
                            }}
                            title={isMuted ? "Mikrofonu Aç" : "Sessiz"}
                        >
                            {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                        </button>

                        {/* Deafen Button */}
                        <button
                            onClick={toggleDeafen}
                            disabled={controlsDisabled}
                            style={{
                                background: isDeafened ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                                border: '1px solid',
                                borderColor: isDeafened ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)',
                                borderRadius: 10,
                                padding: 10,
                                cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                                color: isDeafened ? '#f87171' : 'rgba(255,255,255,0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                opacity: controlsDisabled ? 0.5 : 1
                            }}
                            title={isDeafened ? "Sesi Aç" : "Kulaklık"}
                        >
                            {isDeafened ? <HeadphonesOffIcon className="w-5 h-5" /> : <HeadphonesIcon className="w-5 h-5" />}
                        </button>

                        {/* Settings Button with Dropdown */}
                        <div ref={settingsRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                style={{
                                    background: showSettings ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 10,
                                    padding: 10,
                                    cursor: 'pointer',
                                    color: showSettings ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Ses Ayarları"
                            >
                                <SettingsIcon className="w-5 h-5" />
                            </button>

                            {/* Settings Dropdown */}
                            {showSettings && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        right: 0,
                                        marginBottom: 8,
                                        width: 280,
                                        background: 'linear-gradient(180deg, rgba(35, 35, 40, 0.98) 0%, rgba(25, 25, 30, 0.99) 100%)',
                                        backdropFilter: 'blur(20px)',
                                        borderRadius: 12,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                        padding: 12,
                                        zIndex: 10000
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: 'rgba(255,255,255,0.5)',
                                        textTransform: 'uppercase',
                                        marginBottom: 8,
                                        letterSpacing: '0.5px'
                                    }}>
                                        Ses Ayarları
                                    </div>

                                    {/* Input Device */}
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,0.7)',
                                            marginBottom: 6
                                        }}>
                                            <MicIcon className="w-3 h-3 inline mr-2" />
                                            Giriş Aygıtı
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                value={selectedInput}
                                                onChange={(e) => setSelectedInput(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 28px 8px 10px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 8,
                                                    color: 'rgba(255,255,255,0.9)',
                                                    fontSize: 12,
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    appearance: 'none'
                                                }}
                                            >
                                                {inputDevices.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Output Device */}
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,0.7)',
                                            marginBottom: 6
                                        }}>
                                            <HeadphonesIcon className="w-3 h-3 inline mr-2" />
                                            Çıkış Aygıtı
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                value={selectedOutput}
                                                onChange={(e) => setSelectedOutput(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 28px 8px 10px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 8,
                                                    color: 'rgba(255,255,255,0.9)',
                                                    fontSize: 12,
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    appearance: 'none'
                                                }}
                                            >
                                                {outputDevices.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Note */}
                                    <div style={{
                                        marginTop: 12,
                                        padding: '8px 10px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        color: 'rgba(147, 197, 253, 0.8)',
                                        lineHeight: 1.4
                                    }}>
                                        💡 Değişiklikler anlık olarak uygulanır
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Rnd>
    );
}
