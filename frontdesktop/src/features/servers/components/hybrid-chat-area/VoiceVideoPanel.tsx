import { UsersIcon, ChevronRightIcon, MicOffIcon, VideoIcon } from "./HybridIcons";

interface VoiceVideoPanelProps {
    isConnected: boolean;
    isConnecting: boolean;
    participants: Array<{
        id: string;
        name: string;
        avatarGradient?: [string, string];
        isSpeaking?: boolean;
        isMuted?: boolean;
        hasVideo?: boolean;
    }>;
    onCollapse: () => void;
}

export function VoiceVideoPanel({ isConnected, isConnecting, participants, onCollapse }: VoiceVideoPanelProps) {
    return (
        <div className="w-64 lg:w-80 flex flex-col border-l border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
            {/* Panel Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-300">
                        Katılımcılar ({participants.length})
                    </span>
                </div>
                <button
                    onClick={onCollapse}
                    className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Status */}
            {isConnecting && (
                <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-sm text-yellow-400">Bağlanıyor...</span>
                    </div>
                </div>
            )}

            {isConnected && (
                <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-400">Sesli Sohbette</span>
                    </div>
                </div>
            )}

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto p-2">
                {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <UsersIcon className="w-8 h-8 text-zinc-600 mb-2" />
                        <p className="text-sm text-zinc-500">Henüz kimse yok</p>
                        <p className="text-xs text-zinc-600">Sesli sohbete katıl!</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {participants.map((participant) => (
                            <div
                                key={participant.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${participant.isSpeaking ? "bg-green-500/10 ring-1 ring-green-500/30" : "hover:bg-white/5"
                                    }`}
                            >
                                {/* Avatar */}
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                                    style={{
                                        background: participant.avatarGradient
                                            ? `linear-gradient(135deg, ${participant.avatarGradient[0]}, ${participant.avatarGradient[1]})`
                                            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    }}
                                >
                                    {participant.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm text-zinc-200 truncate block">
                                        {participant.name}
                                    </span>
                                </div>

                                {/* Status Icons */}
                                <div className="flex items-center gap-1">
                                    {participant.isSpeaking && (
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        </div>
                                    )}
                                    {participant.isMuted && (
                                        <MicOffIcon className="w-4 h-4 text-red-400" />
                                    )}
                                    {participant.hasVideo && (
                                        <VideoIcon className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
