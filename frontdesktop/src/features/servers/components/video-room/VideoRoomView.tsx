import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoTiles, type VideoParticipant } from "../../hooks/useVideoTiles";
import type { Channel } from "../../../../api/types";
import { VideoIcon, ChevronDownIcon as FullscreenIcon } from "../Icons";
import { VideoTile } from "./VideoTile";
import { VideoControls } from "./VideoControls";

interface VideoRoomViewProps {
    channel: Channel;
    participants: VideoParticipant[];
    localParticipant: VideoParticipant | null;
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onDisconnect: () => void;
}

export function VideoRoomView({
    channel,
    participants,
    localParticipant,
    isMuted,
    isCameraOn,
    isScreenSharing,
    onToggleMute,
    onToggleCamera,
    onToggleScreenShare,
    onDisconnect,
}: VideoRoomViewProps) {
    const { tiles, allParticipants, focusedParticipant, setFocusedParticipant } = useVideoTiles(
        participants,
        localParticipant
    );

    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const gridCols = tiles.length <= 1 ? 1
        : tiles.length <= 4 ? 2
            : tiles.length <= 9 ? 3
                : 4;

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        handleFullscreenChange();
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            const el = containerRef.current;
            if (el && "requestFullscreen" in el) {
                await (el as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen();
            }
        } catch {
        }
    }, []);

    return (
        <div ref={containerRef} className="flex-1 flex flex-col bg-[#0a0a0f]">
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                    <VideoIcon className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-zinc-100">{channel.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-xs font-medium">
                        LIVE
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">
                        {allParticipants.length} katılımcı
                    </span>
                    <button
                        onClick={() => void toggleFullscreen()}
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-400"
                        aria-pressed={isFullscreen}
                        title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
                    >
                        <FullscreenIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 overflow-hidden">
                <div
                    className="h-full grid gap-3"
                    style={{
                        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                        gridAutoRows: "1fr",
                    }}
                >
                    {tiles.map((participant) => (
                        <VideoTile
                            key={participant.tileId}
                            participant={participant}
                            isFocused={focusedParticipant === participant.tileId}
                            onClick={() => setFocusedParticipant(
                                focusedParticipant === participant.tileId ? null : participant.tileId
                            )}
                        />
                    ))}

                    {/* Empty state */}
                    {tiles.length === 0 && (
                        <div className="flex items-center justify-center text-zinc-500 col-span-full">
                            <div className="text-center">
                                <VideoIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">Video odası boş</p>
                                <p className="text-sm mt-1">İlk katılımcı siz olun!</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <VideoControls
                isMuted={isMuted}
                isCameraOn={isCameraOn}
                isScreenSharing={isScreenSharing}
                onToggleMute={onToggleMute}
                onToggleCamera={onToggleCamera}
                onToggleScreenShare={onToggleScreenShare}
                onDisconnect={onDisconnect}
            />
        </div>
    );
}
