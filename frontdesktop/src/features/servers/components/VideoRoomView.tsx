import { useCallback, useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import type { VoiceChannel } from "../../voice/voiceApi";
import {
    VideoIcon,
    VideoOffIcon,
    MicIcon,
    MicOffIcon,
    ScreenShareIcon,
    PhoneOffIcon,
    ChevronDownIcon as FullscreenIcon
} from "./Icons";
import { ControlButton } from "./ControlButton";

interface VideoParticipant {
    sid: string;
    identity: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isLocal: boolean;
    cameraTrack?: Track | null;
    screenShareTrack?: Track | null;
}

interface VideoRoomViewProps {
    channel: VoiceChannel;
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const allParticipants = localParticipant
        ? [localParticipant, ...participants.filter(p => !p.isLocal)]
        : participants;

    const tiles: VideoTileItem[] = allParticipants.flatMap((p) => {
        const base: Omit<VideoTileItem, "tileId" | "tileKind" | "track" | "hasVideo"> = {
            sid: p.sid,
            identity: p.identity,
            isSpeaking: p.isSpeaking,
            isMuted: p.isMuted,
            isCameraOn: p.isCameraOn,
            isScreenSharing: p.isScreenSharing,
            isLocal: p.isLocal,
        };

        const cameraTile: VideoTileItem = {
            ...base,
            tileId: `${p.sid}:camera`,
            tileKind: "camera",
            track: p.cameraTrack ?? null,
            hasVideo: !!(p.isCameraOn && p.cameraTrack),
        };

        const screenTile: VideoTileItem | null =
            p.isScreenSharing && p.screenShareTrack
                ? {
                    ...base,
                    tileId: `${p.sid}:screen`,
                    tileKind: "screen",
                    track: p.screenShareTrack ?? null,
                    hasVideo: true,
                }
                : null;

        return screenTile ? [screenTile, cameraTile] : [cameraTile];
    });

    useEffect(() => {
        const screenTile = tiles.find((t) => t.tileKind === "screen");
        if (!screenTile) {
            if (focusedParticipant && !tiles.some((t) => t.tileId === focusedParticipant)) {
                setFocusedParticipant(null);
            }
            return;
        }

        if (!focusedParticipant) {
            setFocusedParticipant(screenTile.tileId);
            return;
        }

        const focusedExists = tiles.some((t) => t.tileId === focusedParticipant);
        if (!focusedExists) {
            setFocusedParticipant(screenTile.tileId);
        }
    }, [focusedParticipant, tiles]);

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

            {/* Controls Bar */}
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
        </div>
    );
}

// Sub-components

interface VideoTileItem {
    tileId: string;
    tileKind: "camera" | "screen";
    sid: string;
    identity: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isLocal: boolean;
    track: Track | null;
    hasVideo: boolean;
}

interface VideoTileProps {
    participant: VideoTileItem;
    isFocused: boolean;
    onClick: () => void;
}

function VideoTile({ participant, isFocused, onClick }: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const track = participant.track;
        const el = videoRef.current;

        if (track && el) {
            (track as any).attach(el);
            return () => {
                (track as any).detach(el);
            };
        }
    }, [participant.track]);

    return (
        <div
            onClick={onClick}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all bg-zinc-900 border border-white/5 ${isFocused ? "ring-2 ring-purple-500 col-span-2 row-span-2" : ""
                }`}
        >
            {/* Video element */}
            {participant.hasVideo && participant.track ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/80 backdrop-blur-sm">
                    <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 ${participant.isSpeaking
                            ? "bg-green-500 ring-4 ring-green-400/30 shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-pulse"
                            : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl"
                            }`}
                    >
                        {participant.identity[0]?.toUpperCase() || "?"}
                    </div>
                </div>
            )}

            {/* Screen share indicator */}
            {participant.tileKind === "screen" && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md border border-green-500/30">
                    <ScreenShareIcon className="w-3 h-3" />
                    Live
                </div>
            )}

            {/* Name tag */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate drop-shadow-md">
                                {participant.identity}
                                {participant.isLocal && " (Sen)"}
                                {participant.tileKind === "screen" && " • Screen"}
                            </span>
                            {participant.isSpeaking && (
                                <div className="flex gap-0.5 items-center h-3">
                                    <div className="w-0.5 h-full bg-green-500 animate-[bounce_0.6s_infinite]" />
                                    <div className="w-0.5 h-2/3 bg-green-500 animate-[bounce_0.6s_0.1s_infinite]" />
                                    <div className="w-0.5 h-full bg-green-500 animate-[bounce_0.6s_0.2s_infinite]" />
                                </div>
                            )}
                        </div>
                    </div>
                    {participant.isMuted && participant.tileKind !== "screen" && (
                        <div className="p-1 rounded-md bg-red-500/20 border border-red-500/30">
                            <MicOffIcon className="w-3.5 h-3.5 text-red-400" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
