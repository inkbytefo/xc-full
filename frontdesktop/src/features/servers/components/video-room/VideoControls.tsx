import {
    MicIcon,
    MicOffIcon,
    VideoIcon,
    VideoOffIcon,
    ScreenShareIcon,
    PhoneOffIcon
} from "../Icons";
import { ControlButton } from "../ControlButton";

interface VideoControlsProps {
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onDisconnect: () => void;
}

export function VideoControls({
    isMuted,
    isCameraOn,
    isScreenSharing,
    onToggleMute,
    onToggleCamera,
    onToggleScreenShare,
    onDisconnect,
}: VideoControlsProps) {
    return (
        <div className="h-20 px-6 flex items-center justify-center gap-4 border-t border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
            {/* Mute */}
            <ControlButton
                icon={MicIcon}
                activeIcon={MicOffIcon}
                isActive={isMuted}
                danger={isMuted}
                label={isMuted ? "Sesi Aç" : "Sesini Kapat"}
                onClick={onToggleMute}
            />

            {/* Camera */}
            <ControlButton
                icon={VideoIcon}
                activeIcon={VideoOffIcon}
                isActive={!isCameraOn}
                danger={!isCameraOn}
                label={isCameraOn ? "Kamerayı Kapat" : "Kamerayı Aç"}
                onClick={onToggleCamera}
            />

            {/* Screen Share */}
            <ControlButton
                icon={ScreenShareIcon}
                isActive={isScreenSharing}
                label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                onClick={onToggleScreenShare}
            />

            {/* Leave */}
            <ControlButton
                icon={PhoneOffIcon}
                danger
                label="Ayrıl"
                onClick={onDisconnect}
            />
        </div>
    );
}
