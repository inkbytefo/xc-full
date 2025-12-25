// ============================================================================
// Voice Controls Component - Mute/Deafen/Disconnect
// ============================================================================

interface VoiceControlsProps {
    isMuted: boolean;
    isDeafened: boolean;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onDisconnect: () => void;
}

export function VoiceControls({
    isMuted,
    isDeafened,
    onToggleMute,
    onToggleDeafen,
    onDisconnect,
}: VoiceControlsProps) {
    return (
        <div className="flex items-center gap-2 p-2 bg-[#1a1a20] rounded-lg border border-white/10">
            {/* Mute Button */}
            <button
                onClick={onToggleMute}
                className={`p-2 rounded-lg transition-colors ${isMuted
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-white/10 text-zinc-300 hover:bg-white/20"
                    }`}
                title={isMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
            >
                {isMuted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}
            </button>

            {/* Deafen Button */}
            <button
                onClick={onToggleDeafen}
                className={`p-2 rounded-lg transition-colors ${isDeafened
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-white/10 text-zinc-300 hover:bg-white/20"
                    }`}
                title={isDeafened ? "Sesi Aç" : "Sesi Kapat"}
            >
                {isDeafened ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                )}
            </button>

            {/* Disconnect Button */}
            <button
                onClick={onDisconnect}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Kanaldan Ayrıl"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
            </button>
        </div>
    );
}
