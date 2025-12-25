// ============================================================================
// Voice Widget - Overlay Ses Kontrol Paneli
// ============================================================================

import { useVoiceStore } from '../../../store/voiceStore';
import { BaseWidget } from './BaseWidget';

// SVG Icons - Main Frontend ile tutarlı
const MicIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
    </svg>
);

const MicOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
);

const HeadphonesIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
    </svg>
);

const HeadphonesOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
);

const PhoneOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z"
        />
    </svg>
);

const VolumeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
    </svg>
);

export function VoiceWidget() {
    const {
        isConnected,
        isMuted,
        isDeafened,
        toggleMute,
        toggleDeafen,
        disconnect,
        participants,
        activeChannel
    } = useVoiceStore();

    return (
        <BaseWidget
            id="voice"
            title="Ses Kontrol"
            icon="🔊"
            defaultPosition={{ x: 100, y: 550 }}
            defaultSize={{ width: 320, height: 280 }}
        >
            {/* Channel Status */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <VolumeIcon className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-zinc-400'}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {isConnected && activeChannel ? (
                        <>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#4ade80', marginBottom: 2 }}>
                                {activeChannel.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                Ses Bağlantısı • {participants.length} kişi
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                                Bağlı Değil
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                Bir ses kanalına katılın
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Participants Grid */}
            {isConnected && participants.length > 0 && (
                <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                    {participants.slice(0, 8).map((p) => (
                        <div
                            key={p.sid}
                            title={p.identity + (p.isLocal ? ' (Sen)' : '')}
                            style={{
                                position: 'relative',
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: p.isSpeaking
                                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                    : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#fff',
                                boxShadow: p.isSpeaking
                                    ? '0 0 0 3px rgba(34, 197, 94, 0.4)'
                                    : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {p.identity[0]?.toUpperCase() || '?'}
                            {p.isMuted && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MicOffIcon className="w-2.5 h-2.5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {participants.length > 8 && (
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.6)'
                        }}>
                            +{participants.length - 8}
                        </div>
                    )}
                </div>
            )}

            {/* Voice Controls */}
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'center',
                gap: '12px'
            }}>
                {/* Mute Button */}
                <button
                    onClick={toggleMute}
                    disabled={!isConnected}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        border: 'none',
                        background: isMuted
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(255, 255, 255, 0.1)',
                        color: isMuted ? '#f87171' : 'rgba(255,255,255,0.8)',
                        cursor: isConnected ? 'pointer' : 'not-allowed',
                        opacity: isConnected ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                    title={isMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
                >
                    {isMuted ? <MicOffIcon /> : <MicIcon />}
                </button>

                {/* Deafen Button */}
                <button
                    onClick={toggleDeafen}
                    disabled={!isConnected}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        border: 'none',
                        background: isDeafened
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(255, 255, 255, 0.1)',
                        color: isDeafened ? '#f87171' : 'rgba(255,255,255,0.8)',
                        cursor: isConnected ? 'pointer' : 'not-allowed',
                        opacity: isConnected ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                    title={isDeafened ? "Sesi Aç" : "Sesi Kapat"}
                >
                    {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                </button>

                {/* Divider */}
                {isConnected && (
                    <div style={{
                        width: 1,
                        height: 32,
                        background: 'rgba(255,255,255,0.1)',
                        alignSelf: 'center'
                    }} />
                )}

                {/* Disconnect Button */}
                {isConnected && (
                    <button
                        onClick={disconnect}
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            border: 'none',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        title="Bağlantıyı Kes"
                    >
                        <PhoneOffIcon />
                    </button>
                )}
            </div>

            {/* Not Connected Hint */}
            {!isConnected && (
                <div style={{
                    padding: '0 16px 16px',
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)'
                }}>
                    Ses kontrollerini kullanmak için bir sunucudan ses kanalına katılın
                </div>
            )}
        </BaseWidget>
    );
}
