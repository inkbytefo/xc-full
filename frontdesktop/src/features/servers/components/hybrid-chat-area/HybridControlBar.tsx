import {
    MicIcon,
    MicOffIcon,
    VideoIcon,
    VideoOffIcon,
    HeadphonesIcon,
    PhoneIcon
} from "./HybridIcons";

interface HybridControlBarProps {
    // Message input
    messageText: string;
    onMessageChange: (text: string) => void;
    onSend: () => void;
    sending: boolean;
    channelName: string;
    onTyping?: () => void;
    canSend?: boolean; // Permission to send messages

    // Voice controls
    isConnected: boolean;
    isConnecting: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    isVideoEnabled: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onToggleVideo: () => void;
}

export function HybridControlBar({
    messageText,
    onMessageChange,
    onSend,
    sending,
    channelName,
    onTyping,
    canSend = true,
    isConnected,
    isConnecting,
    isMuted,
    isDeafened,
    isVideoEnabled,
    onConnect,
    onDisconnect,
    onToggleMute,
    onToggleDeafen,
    onToggleVideo,
}: HybridControlBarProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (messageText.trim() && !sending) {
                onSend();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onMessageChange(e.target.value);
        onTyping?.();
    };

    return (
        <div className="shrink-0 border-t border-white/10 bg-[#0d0d12]/90 backdrop-blur-xl">
            <div className="flex items-end gap-3 p-3">
                {/* Message Input */}
                <div className="flex-1 relative">
                    {canSend ? (
                        <textarea
                            value={messageText}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder={`Mesaj yaz #${channelName}`}
                            disabled={sending}
                            rows={1}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 outline-none resize-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                            style={{ minHeight: "48px", maxHeight: "120px" }}
                        />
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm text-yellow-200/70">Bu kanala mesaj gönderme izniniz yok.</span>
                        </div>
                    )}
                </div>

                {/* Voice Controls */}
                <div className="flex items-center gap-1">
                    {!isConnected && !isConnecting ? (
                        <button
                            onClick={onConnect}
                            className="flex items-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors"
                        >
                            <PhoneIcon className="w-5 h-5" />
                            <span className="text-sm font-medium hidden sm:inline">Katıl</span>
                        </button>
                    ) : (
                        <>
                            {/* Mute */}
                            <button
                                onClick={onToggleMute}
                                disabled={isConnecting}
                                className={`p-3 rounded-xl transition-colors ${isMuted
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                                    } disabled:opacity-50`}
                                title={isMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
                            >
                                {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                            </button>

                            {/* Video */}
                            <button
                                onClick={onToggleVideo}
                                disabled={isConnecting}
                                className={`p-3 rounded-xl transition-colors ${isVideoEnabled
                                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                                    } disabled:opacity-50`}
                                title={isVideoEnabled ? "Kamerayı Kapat" : "Kamerayı Aç"}
                            >
                                {isVideoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOffIcon className="w-5 h-5" />}
                            </button>

                            {/* Deafen */}
                            <button
                                onClick={onToggleDeafen}
                                disabled={isConnecting}
                                className={`p-3 rounded-xl transition-colors ${isDeafened
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                                    } disabled:opacity-50`}
                                title={isDeafened ? "Sesi Aç" : "Sesi Kapat"}
                            >
                                <HeadphonesIcon className="w-5 h-5" />
                            </button>

                            {/* Disconnect */}
                            <button
                                onClick={onDisconnect}
                                disabled={isConnecting}
                                className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                title="Ayrıl"
                            >
                                <PhoneIcon className="w-5 h-5 rotate-[135deg]" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
