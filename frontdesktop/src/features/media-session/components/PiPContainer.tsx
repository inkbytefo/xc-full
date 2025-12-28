// ============================================================================
// PiPContainer - Draggable Picture-in-Picture Container
// ============================================================================
// This component displays the current media session in a floating, draggable
// window when the user navigates away from the session page.
// ============================================================================

import { useRef } from "react";
import { usePiPDrag, useMediaSession, useMediaControls } from "../hooks";
import {
    MicIcon,
    MicOffIcon,
    VideoIcon,
    VideoOffIcon,
    PhoneOffIcon,
    ChevronDownIcon,
} from "../../../components/icons";

// ============================================================================
// INLINE ICONS (to avoid circular dependencies)
// ============================================================================

function ExpandIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
        </svg>
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

interface PiPContainerProps {
    /** Callback when user clicks to expand/return to session */
    onExpand?: () => void;
}

export function PiPContainer({ onExpand }: PiPContainerProps) {
    const {
        sessionType,
        context,
        connection,
        participants,
        pip,
        endSession,
    } = useMediaSession();

    const { isMuted, isCameraOn, toggleMute, toggleCamera } = useMediaControls();
    const { isDragging, dragProps } = usePiPDrag();
    const containerRef = useRef<HTMLDivElement>(null);

    // Don't render if PiP is not enabled or no active session
    if (!pip.enabled || sessionType === "idle") {
        return null;
    }

    // Get session display info
    const getSessionTitle = () => {
        switch (sessionType) {
            case "dm-voice":
            case "dm-video":
                return context.otherUserName || "Arama";
            case "server-voice":
            case "server-video":
                return `#${context.channelName || "kanal"}`;
            case "live-stream":
                return context.streamTitle || "Yayın";
            case "screen-share":
                return `${context.sharingUserName || "Ekran"} paylaşıyor`;
            default:
                return "Medya";
        }
    };

    const getSessionSubtitle = () => {
        switch (sessionType) {
            case "dm-voice":
                return "Sesli Arama";
            case "dm-video":
                return "Görüntülü Arama";
            case "server-voice":
                return context.serverName || "Sunucu";
            case "server-video":
                return context.serverName || "Sunucu";
            case "live-stream":
                return context.streamerName || "Canlı Yayın";
            case "screen-share":
                return context.channelName || "Ekran Paylaşımı";
            default:
                return "";
        }
    };

    const isConnected = connection === "connected";
    const isConnecting = connection === "connecting" || connection === "reconnecting";

    return (
        <div
            ref={containerRef}
            {...dragProps}
            className={`
                fixed rounded-2xl overflow-hidden shadow-2xl
                border border-white/10 bg-zinc-900/95 backdrop-blur-xl
                transition-shadow duration-200
                ${isDragging ? "shadow-purple-500/20 scale-[1.02]" : ""}
            `}
            style={{
                ...dragProps.style,
                width: pip.size.width,
                height: pip.size.height,
            }}
        >
            {/* Video/Content Area */}
            <div className="relative w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900">
                {/* Placeholder for video content */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {sessionType === "dm-video" || sessionType === "server-video" ? (
                        // Video grid could go here
                        <div className="text-zinc-500 text-sm">
                            {participants.length} katılımcı
                        </div>
                    ) : (
                        // Voice/audio session icon
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <MicIcon className="w-8 h-8 text-white" />
                        </div>
                    )}
                </div>

                {/* Connection status overlay */}
                {isConnecting && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-sm">Bağlanıyor...</span>
                        </div>
                    </div>
                )}

                {/* Header - Drag Handle */}
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                                {getSessionTitle()}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">
                                {getSessionSubtitle()}
                            </div>
                        </div>

                        {/* Expand button */}
                        {onExpand && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExpand();
                                }}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <ExpandIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-center gap-2">
                        {/* Mute Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleMute();
                            }}
                            disabled={!isConnected}
                            className={`
                                p-2 rounded-xl transition-all
                                ${isMuted
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-white/10 hover:bg-white/20 text-white"
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {isMuted ? (
                                <MicOffIcon className="w-5 h-5" />
                            ) : (
                                <MicIcon className="w-5 h-5" />
                            )}
                        </button>

                        {/* Camera Button (for video sessions) */}
                        {(sessionType === "dm-video" || sessionType === "server-video") && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCamera();
                                }}
                                disabled={!isConnected}
                                className={`
                                    p-2 rounded-xl transition-all
                                    ${!isCameraOn
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-white/10 hover:bg-white/20 text-white"
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {isCameraOn ? (
                                    <VideoIcon className="w-5 h-5" />
                                ) : (
                                    <VideoOffIcon className="w-5 h-5" />
                                )}
                            </button>
                        )}

                        {/* End Call Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                endSession();
                            }}
                            className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all"
                        >
                            <PhoneOffIcon className="w-5 h-5" />
                        </button>

                        {/* Minimize Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Could minimize to just an icon
                            }}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                        >
                            <ChevronDownIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Participant count badge */}
                {participants.length > 1 && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 text-xs text-white font-medium">
                        {participants.length}
                    </div>
                )}
            </div>
        </div>
    );
}
