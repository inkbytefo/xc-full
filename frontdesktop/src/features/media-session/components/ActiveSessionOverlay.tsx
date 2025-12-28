// ============================================================================
// ActiveSessionOverlay - Global Persistent Voice/Video Session Bar
// ============================================================================
// Similar to Discord's voice channel bar that appears at the bottom.
// Shows when user has an active session but has navigated away.
// ============================================================================

import { useContext } from "react";
import { useLocation, useNavigate, UNSAFE_NavigationContext } from "react-router-dom";
import { useMediaSession, useMediaControls } from "../hooks";
import {
    MicIcon,
    MicOffIcon,
    HeadphonesIcon,
    HeadphonesOffIcon,
    VideoIcon,
    VideoOffIcon,
    ScreenShareIcon,
    PhoneOffIcon,
} from "../../../components/icons";

// ============================================================================
// COMPONENT
// ============================================================================

export function ActiveSessionOverlay() {
    // Check if we're inside a Router context
    const navigationContext = useContext(UNSAFE_NavigationContext);

    // If not inside Router, don't render (avoids useNavigate error)
    if (!navigationContext || !navigationContext.navigator) {
        return null;
    }

    return <ActiveSessionOverlayInner />;
}

function ActiveSessionOverlayInner() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        sessionType,
        context,
        connection,
        participants,
        endSession,
    } = useMediaSession();

    const {
        isMuted,
        isDeafened,
        isCameraOn,
        isScreenSharing,
        toggleMute,
        toggleDeafen,
        toggleCamera,
        toggleScreenShare,
    } = useMediaControls();

    // Don't show if no active session
    if (sessionType === "idle") {
        return null;
    }

    // Don't show if user is on the session page
    const isOnSessionPage = () => {
        const path = location.pathname;

        switch (sessionType) {
            case "dm-voice":
            case "dm-video":
                return context.conversationId && path.includes(`/dm/${context.conversationId}`);
            case "server-voice":
            case "server-video":
                return (
                    context.channelId &&
                    path.includes(`/servers/${context.serverId}`) &&
                    path.includes(`/channels/${context.channelId}`)
                );
            case "live-stream":
                return context.streamId && path.includes(`/live/${context.streamId}`);
            default:
                return false;
        }
    };

    if (isOnSessionPage()) {
        return null;
    }

    // Navigate to session
    const handleReturnToSession = () => {
        switch (sessionType) {
            case "dm-voice":
            case "dm-video":
                if (context.conversationId) {
                    navigate(`/dm/${context.conversationId}`);
                }
                break;
            case "server-voice":
            case "server-video":
                if (context.serverId && context.channelId) {
                    navigate(`/servers/${context.serverId}/channels/${context.channelId}`);
                }
                break;
            case "live-stream":
                if (context.streamId) {
                    navigate(`/live/${context.streamId}`);
                }
                break;
        }
    };

    const isConnected = connection === "connected";
    const isConnecting = connection === "connecting" || connection === "reconnecting";
    const isVideoSession = sessionType === "dm-video" || sessionType === "server-video";

    // Session info
    const getSessionInfo = () => {
        switch (sessionType) {
            case "dm-voice":
            case "dm-video":
                return {
                    title: context.otherUserName || "Arama",
                    subtitle: sessionType === "dm-video" ? "Görüntülü Arama" : "Sesli Arama",
                };
            case "server-voice":
            case "server-video":
                return {
                    title: `#${context.channelName || "kanal"}`,
                    subtitle: context.serverName || "Sunucu",
                };
            case "live-stream":
                return {
                    title: context.streamTitle || "Yayın",
                    subtitle: context.streamerName || "Canlı",
                };
            case "screen-share":
                return {
                    title: context.sharingUserName || "Ekran",
                    subtitle: "Ekran Paylaşımı",
                };
            default:
                return { title: "Oturum", subtitle: "" };
        }
    };

    const { title, subtitle } = getSessionInfo();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] px-4 pb-4 pointer-events-none">
            <div className="max-w-lg mx-auto pointer-events-auto">
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-4 p-3">
                        {/* Status indicator */}
                        <div className="relative">
                            <div
                                className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center
                                    ${isConnected
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-yellow-500/20 text-yellow-400"
                                    }
                                `}
                            >
                                {isConnecting ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <MicIcon className="w-5 h-5" />
                                )}
                            </div>
                            {/* Pulsing dot */}
                            {isConnected && (
                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                            )}
                        </div>

                        {/* Session info - clickable to return */}
                        <button
                            onClick={handleReturnToSession}
                            className="flex-1 text-left min-w-0 hover:opacity-80 transition-opacity"
                        >
                            <div className="text-sm font-semibold text-white truncate">
                                {title}
                            </div>
                            <div className="text-xs text-zinc-400 truncate flex items-center gap-1">
                                <span>{subtitle}</span>
                                {participants.length > 1 && (
                                    <>
                                        <span className="text-zinc-600">•</span>
                                        <span>{participants.length} kişi</span>
                                    </>
                                )}
                            </div>
                        </button>

                        {/* Control buttons */}
                        <div className="flex items-center gap-1">
                            {/* Mute */}
                            <button
                                onClick={() => toggleMute()}
                                disabled={!isConnected}
                                className={`
                                    p-2 rounded-xl transition-all
                                    ${isMuted
                                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                        : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                    }
                                    disabled:opacity-50
                                `}
                                title={isMuted ? "Sesi Aç" : "Sustur"}
                            >
                                {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                            </button>

                            {/* Deafen */}
                            <button
                                onClick={() => toggleDeafen()}
                                disabled={!isConnected}
                                className={`
                                    p-2 rounded-xl transition-all
                                    ${isDeafened
                                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                        : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                    }
                                    disabled:opacity-50
                                `}
                                title={isDeafened ? "Kulaklığı Aç" : "Kulaklığı Kapat"}
                            >
                                {isDeafened ? <HeadphonesOffIcon className="w-5 h-5" /> : <HeadphonesIcon className="w-5 h-5" />}
                            </button>

                            {/* Camera (video sessions only) */}
                            {isVideoSession && (
                                <button
                                    onClick={() => toggleCamera()}
                                    disabled={!isConnected}
                                    className={`
                                        p-2 rounded-xl transition-all
                                        ${!isCameraOn
                                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                        }
                                        disabled:opacity-50
                                    `}
                                    title={isCameraOn ? "Kamerayı Kapat" : "Kamerayı Aç"}
                                >
                                    {isCameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOffIcon className="w-5 h-5" />}
                                </button>
                            )}

                            {/* Screen Share (voice/video sessions) */}
                            {(sessionType === "server-voice" || sessionType === "server-video") && (
                                <button
                                    onClick={() => toggleScreenShare()}
                                    disabled={!isConnected}
                                    className={`
                                        p-2 rounded-xl transition-all
                                        ${isScreenSharing
                                            ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                                        }
                                        disabled:opacity-50
                                    `}
                                    title={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                                >
                                    <ScreenShareIcon className="w-5 h-5" />
                                </button>
                            )}

                            {/* Disconnect */}
                            <button
                                onClick={() => endSession()}
                                className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20"
                                title="Bağlantıyı Kes"
                            >
                                <PhoneOffIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
