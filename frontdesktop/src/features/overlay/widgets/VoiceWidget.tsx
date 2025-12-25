// ============================================================================
// Voice Widget - Overlay Ses Kontrol Paneli
// ============================================================================

import { useVoiceStore } from '../../../store/voiceStore';
import { BaseWidget } from './BaseWidget';
import { useOverlayMode } from '../hooks/useOverlayMode';

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
    const { pinnedView } = useOverlayMode();
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

    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
        if (a.isMuted !== b.isMuted) return a.isMuted ? 1 : -1;
        if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
        return a.identity.localeCompare(b.identity);
    });

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
            {isConnected && sortedParticipants.length > 0 && !pinnedView && (
                <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                    {sortedParticipants.slice(0, 8).map((p) => (
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
                    {sortedParticipants.length > 8 && (
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
                            +{sortedParticipants.length - 8}
                        </div>
                    )}
                </div>
            )}

            {/* Participants List (Pinned View) */}
            {isConnected && sortedParticipants.length > 0 && pinnedView && (
                <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}>
                            {activeChannel?.name ?? 'Ses Kanalı'}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}>
                            {sortedParticipants.length}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sortedParticipants.slice(0, 12).map((p) => (
                            <div
                                key={p.sid}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '6px 8px',
                                    borderRadius: 10,
                                    background: p.isSpeaking ? 'rgba(34,197,94,0.10)' : 'rgba(0,0,0,0.10)',
                                    border: p.isSpeaking ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)',
                                    backdropFilter: 'blur(6px)',
                                }}
                            >
                                <div
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 999,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#fff',
                                        background: p.isSpeaking
                                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                            : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                        boxShadow: p.isSpeaking ? '0 0 0 3px rgba(34, 197, 94, 0.35)' : 'none',
                                        flexShrink: 0,
                                    }}
                                >
                                    {p.identity[0]?.toUpperCase() || '?'}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: 'rgba(255,255,255,0.92)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                                        }}
                                    >
                                        {p.identity}{p.isLocal ? ' (Sen)' : ''}
                                    </div>
                                </div>

                                {p.isMuted && (
                                    <div style={{ color: 'rgba(248,113,113,0.95)', flexShrink: 0 }}>
                                        <MicOffIcon className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {sortedParticipants.length > 12 && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', padding: '2px 8px', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}>
                                +{sortedParticipants.length - 12} kişi daha
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10, opacity: 0.9 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11,
                                color: isMuted ? 'rgba(248,113,113,0.95)' : 'rgba(255,255,255,0.70)',
                                textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                            }}
                        >
                            {isMuted ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                            {isMuted ? 'Sessiz' : 'Açık'}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11,
                                color: isDeafened ? 'rgba(248,113,113,0.95)' : 'rgba(255,255,255,0.70)',
                                textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                            }}
                        >
                            {isDeafened ? <HeadphonesOffIcon className="w-4 h-4" /> : <HeadphonesIcon className="w-4 h-4" />}
                            {isDeafened ? 'Kapalı' : 'Açık'}
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Controls */}
            {!pinnedView && (
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
            )}

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
