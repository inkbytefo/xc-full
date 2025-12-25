import type { VoiceChannel } from "../../voice/voiceApi";
import {
    VolumeIcon,
    MicIcon,
    MicOffIcon,
    HeadphonesIcon,
    HeadphonesOffIcon,
    VideoIcon,
    VideoOffIcon,
    ScreenShareIcon,
    PhoneOffIcon
} from "./Icons";
import { ControlButton } from "./ControlButton";

interface VoiceOverlayProps {
    channel: VoiceChannel;
    participants: Array<{
        sid: string;
        identity: string;
        isSpeaking: boolean;
        isMuted: boolean;
        isLocal: boolean;
    }>;
    isMuted: boolean;
    isDeafened: boolean;
    isCameraOn?: boolean;
    isScreenSharing?: boolean;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onToggleCamera?: () => void;
    onToggleScreenShare?: () => void;
    onDisconnect: () => void;
}

export function VoiceOverlay({
    channel,
    participants,
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    onToggleMute,
    onToggleDeafen,
    onToggleCamera,
    onToggleScreenShare,
    onDisconnect,
}: VoiceOverlayProps) {
    const showVideoControls = channel.type === "video" && !!onToggleCamera && !!onToggleScreenShare;

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a22]/95 backdrop-blur-xl border-t border-white/10 z-20">
            <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <VolumeIcon className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-green-400 truncate">
                            {channel.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                            Ses Bağlantısı • {participants.length} kişi
                        </div>
                    </div>
                </div>

                <div className="flex items-center -space-x-2">
                    {participants.slice(0, 5).map((p, i) => (
                        <div
                            key={p.sid}
                            className={`relative w-8 h-8 rounded-full border-2 border-[#1a1a22] flex items-center justify-center text-xs font-medium ${p.isSpeaking
                                ? "bg-green-500 ring-2 ring-green-400/50 animate-pulse"
                                : "bg-gradient-to-br from-indigo-500 to-purple-600"
                                }`}
                            style={{ zIndex: 5 - i }}
                            title={p.identity + (p.isLocal ? " (Sen)" : "")}
                        >
                            {p.identity[0]?.toUpperCase() || "?"}
                            {p.isMuted && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                                    <MicOffIcon className="w-2 h-2 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {participants.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 border-2 border-[#1a1a22] flex items-center justify-center text-xs text-zinc-300">
                            +{participants.length - 5}
                        </div>
                    )}
                </div>

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
            </div>
        </div>
    );
}

