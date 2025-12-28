// ============================================================================
// VoiceControlBar - Media Control Buttons Component
// ============================================================================
// Reusable control bar for voice/video sessions.
// Can be used in full-screen views, overlays, or standalone.
// ============================================================================

import { useMediaControls, useMediaSession } from "../hooks";
import {
    MicIcon,
    MicOffIcon,
    HeadphonesIcon,
    HeadphonesOffIcon,
    VideoIcon,
    VideoOffIcon,
    ScreenShareIcon,
    PhoneOffIcon,
    SettingsIcon,
} from "../../../components/icons";

// ============================================================================
// TYPES
// ============================================================================

interface VoiceControlBarProps {
    /** Visual variant */
    variant?: "default" | "compact" | "floating";
    /** Show video controls */
    showVideoControls?: boolean;
    /** Show screen share controls */
    showScreenShare?: boolean;
    /** Show settings button */
    showSettings?: boolean;
    /** Settings click handler */
    onSettingsClick?: () => void;
    /** Custom className */
    className?: string;
}

// ============================================================================
// CONTROL BUTTON COMPONENT
// ============================================================================

interface ControlButtonProps {
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

function ControlButton({
    active,
    danger,
    disabled,
    onClick,
    title,
    size = "md",
    children,
}: ControlButtonProps) {
    const sizeClasses = {
        sm: "p-2",
        md: "p-3",
        lg: "p-4",
    };

    const iconSizeClasses = {
        sm: "[&>svg]:w-4 [&>svg]:h-4",
        md: "[&>svg]:w-5 [&>svg]:h-5",
        lg: "[&>svg]:w-6 [&>svg]:h-6",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`
                ${sizeClasses[size]}
                ${iconSizeClasses[size]}
                rounded-xl transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                ${danger
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                    : active
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                        : "bg-white/10 hover:bg-white/20 text-white"
                }
            `}
        >
            {children}
        </button>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VoiceControlBar({
    variant = "default",
    showVideoControls = false,
    showScreenShare = false,
    showSettings = false,
    onSettingsClick,
    className = "",
}: VoiceControlBarProps) {
    const { sessionType, connection, endSession } = useMediaSession();
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

    const isConnected = connection === "connected";
    const buttonSize = variant === "compact" ? "sm" : "md";

    // Auto-detect video session
    const isVideoSession = sessionType === "dm-video" || sessionType === "server-video";
    const shouldShowVideo = showVideoControls || isVideoSession;
    const shouldShowScreenShare = showScreenShare || sessionType === "server-voice" || sessionType === "server-video";

    return (
        <div
            className={`
                flex items-center justify-center gap-2
                ${variant === "floating"
                    ? "bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-2xl"
                    : ""
                }
                ${className}
            `}
        >
            {/* Microphone */}
            <ControlButton
                active={isMuted}
                disabled={!isConnected}
                onClick={() => toggleMute()}
                title={isMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
                size={buttonSize}
            >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
            </ControlButton>

            {/* Headphones / Deafen */}
            <ControlButton
                active={isDeafened}
                disabled={!isConnected}
                onClick={() => toggleDeafen()}
                title={isDeafened ? "Sağır Modunu Kapat" : "Sağır Modu"}
                size={buttonSize}
            >
                {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
            </ControlButton>

            {/* Video (conditional) */}
            {shouldShowVideo && (
                <ControlButton
                    active={!isCameraOn}
                    disabled={!isConnected}
                    onClick={() => toggleCamera()}
                    title={isCameraOn ? "Kamerayı Kapat" : "Kamerayı Aç"}
                    size={buttonSize}
                >
                    {isCameraOn ? <VideoIcon /> : <VideoOffIcon />}
                </ControlButton>
            )}

            {/* Screen Share (conditional) */}
            {shouldShowScreenShare && (
                <ControlButton
                    active={false}
                    disabled={!isConnected}
                    onClick={() => toggleScreenShare()}
                    title={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                    size={buttonSize}
                >
                    <ScreenShareIcon className={isScreenSharing ? "text-purple-400" : ""} />
                </ControlButton>
            )}

            {/* Settings (conditional) */}
            {showSettings && onSettingsClick && (
                <ControlButton
                    onClick={onSettingsClick}
                    title="Ayarlar"
                    size={buttonSize}
                >
                    <SettingsIcon />
                </ControlButton>
            )}

            {/* Disconnect */}
            <ControlButton
                danger
                onClick={() => endSession()}
                title="Bağlantıyı Kes"
                size={buttonSize}
            >
                <PhoneOffIcon />
            </ControlButton>
        </div>
    );
}
