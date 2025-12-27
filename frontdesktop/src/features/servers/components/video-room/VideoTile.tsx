import { useRef, useEffect } from "react";
import { type VideoTileItem } from "../../hooks/useVideoTiles";
import { MicOffIcon, ScreenShareIcon } from "../Icons";

interface VideoTileProps {
    participant: VideoTileItem;
    isFocused: boolean;
    onClick: () => void;
}

export function VideoTile({ participant, isFocused, onClick }: VideoTileProps) {
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
