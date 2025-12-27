import { Track } from "livekit-client";
import { useEffect, useMemo, useState } from "react";

export interface VideoParticipant {
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

export interface VideoTileItem {
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

export function useVideoTiles(
    participants: VideoParticipant[],
    localParticipant: VideoParticipant | null
) {
    const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);

    const allParticipants = useMemo(() => {
        return localParticipant
            ? [localParticipant, ...participants.filter((p) => !p.isLocal)]
            : participants;
    }, [participants, localParticipant]);

    const tiles: VideoTileItem[] = useMemo(() => {
        return allParticipants.flatMap((p) => {
            const base: Omit<
                VideoTileItem,
                "tileId" | "tileKind" | "track" | "hasVideo"
            > = {
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
    }, [allParticipants]);

    // Format focused participant logic
    useEffect(() => {
        const screenTile = tiles.find((t) => t.tileKind === "screen");
        if (screenTile) {
            // Auto focus screen share unless explicitly focused on something else
            if (!focusedParticipant) {
                setFocusedParticipant(screenTile.tileId);
            } else {
                // If current focus is invalid, switch to screen share
                const focusedExists = tiles.some((t) => t.tileId === focusedParticipant);
                if (!focusedExists) {
                    setFocusedParticipant(screenTile.tileId);
                }
            }
        } else {
            // No screen share, clear invalid focus
            if (focusedParticipant && !tiles.some((t) => t.tileId === focusedParticipant)) {
                setFocusedParticipant(null);
            }
        }
    }, [focusedParticipant, tiles]);

    return {
        tiles,
        allParticipants,
        focusedParticipant,
        setFocusedParticipant,
    };
}
