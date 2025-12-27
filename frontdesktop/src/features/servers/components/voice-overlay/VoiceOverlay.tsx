import type { Channel } from "../../../../api/types";
import { VolumeIcon } from "../Icons";
import { VoiceParticipantItem } from "./VoiceParticipantItem";
import { VoiceControlBar } from "./VoiceControlBar";

interface VoiceOverlayProps {
    channel: Channel;
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
                        <VoiceParticipantItem
                            key={p.sid}
                            {...p}
                            zIndex={5 - i}
                        />
                    ))}
                    {participants.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 border-2 border-[#1a1a22] flex items-center justify-center text-xs text-zinc-300">
                            +{participants.length - 5}
                        </div>
                    )}
                </div>

                <VoiceControlBar
                    isMuted={isMuted}
                    isDeafened={isDeafened}
                    isCameraOn={isCameraOn}
                    isScreenSharing={isScreenSharing}
                    showVideoControls={showVideoControls}
                    onToggleMute={onToggleMute}
                    onToggleDeafen={onToggleDeafen}
                    onToggleCamera={onToggleCamera}
                    onToggleScreenShare={onToggleScreenShare}
                    onDisconnect={onDisconnect}
                />
            </div>
        </div>
    );
}
