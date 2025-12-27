import {
    MicIcon,
    MicOffIcon,
    HeadphonesIcon,
    HeadphonesOffIcon,
    VideoIcon,
    VideoOffIcon,
    ScreenShareIcon,
    PhoneOffIcon
} from "../Icons";
import { ControlButton } from "../ControlButton";

interface VoiceControlBarProps {
    isMuted: boolean;
    isDeafened: boolean;
    isCameraOn?: boolean;
    isScreenSharing?: boolean;
    showVideoControls: boolean;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onToggleCamera?: () => void;
    onToggleScreenShare?: () => void;
    onDisconnect: () => void;
}

export function VoiceControlBar({
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    showVideoControls,
    onToggleMute,
    onToggleDeafen,
    onToggleCamera,
    onToggleScreenShare,
    onDisconnect,
}: VoiceControlBarProps) {
    return (
        <div className="flex items-center gap-2">
            <ControlButton
                icon={MicIcon}
                activeIcon={MicOffIcon}
                isActive={isMuted}
                danger={isMuted}
                label={isMuted ? "Sesi Aç" : "Sessiz"}
                onClick={onToggleMute}
                className="!p-2.5 !rounded-xl"
            />

            <ControlButton
                icon={HeadphonesIcon}
                activeIcon={HeadphonesOffIcon}
                isActive={isDeafened}
                danger={isDeafened}
                label={isDeafened ? "Kulaklığı Aç" : "Kulaklık"}
                onClick={onToggleDeafen}
                className="!p-2.5 !rounded-xl"
            />

            {showVideoControls && (
                <>
                    <ControlButton
                        icon={VideoIcon}
                        activeIcon={VideoOffIcon}
                        isActive={!isCameraOn}
                        danger={!isCameraOn}
                        label={isCameraOn ? "Kamerayı Kapat" : "Kamera Aç"}
                        onClick={onToggleCamera!}
                        className="!p-2.5 !rounded-xl"
                    />
                    <ControlButton
                        icon={ScreenShareIcon}
                        isActive={!!isScreenSharing}
                        label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                        onClick={onToggleScreenShare!}
                        className="!p-2.5 !rounded-xl"
                    />
                </>
            )}

            <div className="w-px h-6 bg-white/10 mx-1" />

            <ControlButton
                icon={PhoneOffIcon}
                isActive
                danger
                label="Bağlantıyı Kes"
                onClick={onDisconnect}
                className="!p-2.5 !rounded-xl"
            />
        </div>
    );
}
