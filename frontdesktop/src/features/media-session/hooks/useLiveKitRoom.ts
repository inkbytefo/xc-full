// ============================================================================
// useLiveKitRoom Hook - LiveKit Room Connection Management
// ============================================================================
// This hook provides a clean interface for managing LiveKit room connections.
// It's used internally by the mediaSessionStore but can also be used directly
// for advanced use cases.
// ============================================================================

import { useEffect, useCallback, useRef } from "react";
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    LocalParticipant,
    ConnectionState,
    Track,
    type LocalTrackPublication,
    type RemoteTrackPublication,
    type RoomOptions,
} from "livekit-client";
import { getVoiceToken } from "../api/serverVoiceApi";

// ============================================================================
// TYPES
// ============================================================================

export interface LiveKitParticipant {
    sid: string;
    identity: string;
    displayName: string;
    handle: string;
    avatarGradient: [string, string];
    isMuted: boolean;
    isSpeaking: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isLocal: boolean;
    cameraTrack: Track | null;
    screenShareTrack: Track | null;
}

export type LiveKitConnectionState =
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting";

export interface UseLiveKitRoomOptions {
    /** Room name / channel ID to connect to */
    roomName: string;
    /** Whether to auto-connect on mount */
    autoConnect?: boolean;
    /** Enable microphone on connect */
    enableMicrophone?: boolean;
    /** Enable camera on connect */
    enableCamera?: boolean;
    /** Custom room options */
    roomOptions?: Partial<RoomOptions>;
    /** Callbacks */
    onConnected?: () => void;
    onDisconnected?: () => void;
    onParticipantConnected?: (participant: LiveKitParticipant) => void;
    onParticipantDisconnected?: (participant: LiveKitParticipant) => void;
    onParticipantsChanged?: (participants: LiveKitParticipant[]) => void;
    onConnectionStateChanged?: (state: LiveKitConnectionState) => void;
    onError?: (error: Error) => void;
}

export interface UseLiveKitRoomResult {
    // State
    room: Room | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: LiveKitConnectionState;
    participants: LiveKitParticipant[];
    localParticipant: LiveKitParticipant | null;
    error: Error | null;

    // Actions
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    toggleMute: () => Promise<void>;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    setAudioDevice: (deviceId: string) => Promise<void>;
    setVideoDevice: (deviceId: string) => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880";

const DEFAULT_ROOM_OPTIONS: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
        resolution: { width: 1280, height: 720 },
    },
    publishDefaults: {
        simulcast: true,
        videoCodec: "vp8",
        dtx: true,
        red: true,
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseMetadata(metadata: string | undefined): {
    displayName: string;
    handle: string;
    avatarGradient: [string, string];
} {
    try {
        if (!metadata) return { displayName: "Unknown", handle: "unknown", avatarGradient: ["#333", "#666"] };
        const data = JSON.parse(metadata);
        return {
            displayName: data.displayName || "Unknown",
            handle: data.handle || "unknown",
            avatarGradient: data.avatarGradient || ["#333", "#666"],
        };
    } catch {
        return { displayName: "Unknown", handle: "unknown", avatarGradient: ["#333", "#666"] };
    }
}

function getVideoTrack(
    publications: Map<string, LocalTrackPublication | RemoteTrackPublication>
): Track | null {
    for (const pub of publications.values()) {
        if (pub.track && pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
            return pub.track as Track;
        }
    }
    return null;
}

function getScreenShareTrack(
    publications: Map<string, LocalTrackPublication | RemoteTrackPublication>
): Track | null {
    for (const pub of publications.values()) {
        if (pub.track && pub.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
            return pub.track as Track;
        }
    }
    return null;
}

function hasScreenShare(
    publications: Map<string, LocalTrackPublication | RemoteTrackPublication>
): boolean {
    for (const pub of publications.values()) {
        if (pub.track && pub.source === Track.Source.ScreenShare) {
            return true;
        }
    }
    return false;
}

function mapLocalParticipant(participant: LocalParticipant): LiveKitParticipant {
    const meta = parseMetadata(participant.metadata);
    const pubs = participant.trackPublications as unknown as Map<string, LocalTrackPublication>;

    return {
        sid: participant.sid,
        identity: participant.identity,
        displayName: meta.displayName,
        handle: meta.handle,
        avatarGradient: meta.avatarGradient,
        isMuted: !participant.isMicrophoneEnabled,
        isSpeaking: participant.isSpeaking,
        isCameraOn: participant.isCameraEnabled,
        isScreenSharing: hasScreenShare(pubs),
        isLocal: true,
        cameraTrack: getVideoTrack(pubs),
        screenShareTrack: getScreenShareTrack(pubs),
    };
}

function mapRemoteParticipant(participant: RemoteParticipant): LiveKitParticipant {
    const meta = parseMetadata(participant.metadata);
    const pubs = participant.trackPublications as unknown as Map<string, RemoteTrackPublication>;

    return {
        sid: participant.sid,
        identity: participant.identity,
        displayName: meta.displayName,
        handle: meta.handle,
        avatarGradient: meta.avatarGradient,
        isMuted: !participant.isMicrophoneEnabled,
        isSpeaking: participant.isSpeaking,
        isCameraOn: participant.isCameraEnabled,
        isScreenSharing: hasScreenShare(pubs),
        isLocal: false,
        cameraTrack: getVideoTrack(pubs),
        screenShareTrack: getScreenShareTrack(pubs),
    };
}

function mapConnectionState(state: ConnectionState): LiveKitConnectionState {
    switch (state) {
        case ConnectionState.Connected:
            return "connected";
        case ConnectionState.Connecting:
            return "connecting";
        case ConnectionState.Reconnecting:
            return "reconnecting";
        default:
            return "disconnected";
    }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

import { useState } from "react";

export function useLiveKitRoom(options: UseLiveKitRoomOptions): UseLiveKitRoomResult {
    const {
        roomName,
        autoConnect = false,
        enableMicrophone = true,
        enableCamera = false,
        roomOptions,
        onConnected,
        onDisconnected,
        onParticipantConnected,
        onParticipantDisconnected,
        onParticipantsChanged,
        onConnectionStateChanged,
        onError,
    } = options;

    // State
    const [room, setRoom] = useState<Room | null>(null);
    const [connectionState, setConnectionState] = useState<LiveKitConnectionState>("disconnected");
    const [participants, setParticipants] = useState<LiveKitParticipant[]>([]);
    const [localParticipant, setLocalParticipant] = useState<LiveKitParticipant | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Refs for stable callbacks
    const roomRef = useRef<Room | null>(null);

    // Update participants from current room state
    const updateParticipants = useCallback(() => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        const allParticipants: LiveKitParticipant[] = [];

        // Local participant
        const local = mapLocalParticipant(currentRoom.localParticipant);
        allParticipants.push(local);
        setLocalParticipant(local);

        // Remote participants
        currentRoom.remoteParticipants.forEach((p) => {
            allParticipants.push(mapRemoteParticipant(p));
        });

        setParticipants(allParticipants);
        onParticipantsChanged?.(allParticipants);
    }, [onParticipantsChanged]);

    // Connect to room
    const connect = useCallback(async () => {
        if (roomRef.current) {
            console.warn("[useLiveKitRoom] Already connected or connecting");
            return;
        }

        setConnectionState("connecting");
        setError(null);

        try {
            // Get token from API
            const { token } = await getVoiceToken(roomName);

            // Create room instance
            const newRoom = new Room({
                ...DEFAULT_ROOM_OPTIONS,
                ...roomOptions,
            });

            roomRef.current = newRoom;

            // Setup event handlers
            newRoom.on(RoomEvent.Connected, () => {
                setConnectionState("connected");
                updateParticipants();
                onConnected?.();
            });

            newRoom.on(RoomEvent.Disconnected, () => {
                setConnectionState("disconnected");
                setParticipants([]);
                setLocalParticipant(null);
                roomRef.current = null;
                setRoom(null);
                onDisconnected?.();
            });

            newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
                updateParticipants();
                onParticipantConnected?.(mapRemoteParticipant(participant));
            });

            newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
                onParticipantDisconnected?.(mapRemoteParticipant(participant));
                updateParticipants();
            });

            newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
                const mapped = mapConnectionState(state);
                setConnectionState(mapped);
                onConnectionStateChanged?.(mapped);
            });

            // Track events for participant updates
            newRoom.on(RoomEvent.ActiveSpeakersChanged, updateParticipants);
            newRoom.on(RoomEvent.TrackMuted, updateParticipants);
            newRoom.on(RoomEvent.TrackUnmuted, updateParticipants);
            newRoom.on(RoomEvent.TrackSubscribed, updateParticipants);
            newRoom.on(RoomEvent.TrackUnsubscribed, updateParticipants);
            newRoom.on(RoomEvent.LocalTrackPublished, updateParticipants);
            newRoom.on(RoomEvent.LocalTrackUnpublished, updateParticipants);

            // Connect to LiveKit server
            await newRoom.connect(LIVEKIT_URL, token);

            // Enable media as requested
            if (enableMicrophone) {
                await newRoom.localParticipant.setMicrophoneEnabled(true);
            }
            if (enableCamera) {
                await newRoom.localParticipant.setCameraEnabled(true);
            }

            setRoom(newRoom);
            setConnectionState("connected");
            updateParticipants();

        } catch (err) {
            const error = err instanceof Error ? err : new Error("Connection failed");
            console.error("[useLiveKitRoom] Connection error:", error);
            setError(error);
            setConnectionState("disconnected");
            roomRef.current = null;
            onError?.(error);
            throw error;
        }
    }, [
        roomName,
        roomOptions,
        enableMicrophone,
        enableCamera,
        updateParticipants,
        onConnected,
        onDisconnected,
        onParticipantConnected,
        onParticipantDisconnected,
        onConnectionStateChanged,
        onError,
    ]);

    // Disconnect from room
    const disconnect = useCallback(async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        currentRoom.removeAllListeners();
        await currentRoom.disconnect();

        roomRef.current = null;
        setRoom(null);
        setConnectionState("disconnected");
        setParticipants([]);
        setLocalParticipant(null);
    }, []);

    // Toggle microphone
    const toggleMute = useCallback(async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        const isEnabled = currentRoom.localParticipant.isMicrophoneEnabled;
        await currentRoom.localParticipant.setMicrophoneEnabled(!isEnabled);
        updateParticipants();
    }, [updateParticipants]);

    // Toggle camera
    const toggleCamera = useCallback(async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        const isEnabled = currentRoom.localParticipant.isCameraEnabled;
        await currentRoom.localParticipant.setCameraEnabled(!isEnabled);
        updateParticipants();
    }, [updateParticipants]);

    // Toggle screen share
    const toggleScreenShare = useCallback(async () => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        const isEnabled = currentRoom.localParticipant.isScreenShareEnabled;
        await currentRoom.localParticipant.setScreenShareEnabled(!isEnabled);
        updateParticipants();
    }, [updateParticipants]);

    // Set audio input device
    const setAudioDevice = useCallback(async (deviceId: string) => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        const roomWithSwitch = currentRoom as unknown as {
            switchActiveDevice?: (kind: "audioinput" | "audiooutput", deviceId: string) => Promise<void>;
        };

        if (roomWithSwitch.switchActiveDevice) {
            await roomWithSwitch.switchActiveDevice("audioinput", deviceId);
        }
    }, []);

    // Set video input device
    const setVideoDevice = useCallback(async (deviceId: string) => {
        const currentRoom = roomRef.current;
        if (!currentRoom) return;

        const roomWithSwitch = currentRoom as unknown as {
            switchActiveDevice?: (kind: "videoinput", deviceId: string) => Promise<void>;
        };

        if (roomWithSwitch.switchActiveDevice) {
            await roomWithSwitch.switchActiveDevice("videoinput", deviceId);
        }
    }, []);

    // Auto-connect on mount if enabled
    useEffect(() => {
        if (autoConnect && roomName) {
            connect().catch(console.error);
        }

        return () => {
            // Cleanup on unmount
            if (roomRef.current) {
                roomRef.current.removeAllListeners();
                roomRef.current.disconnect().catch(console.error);
                roomRef.current = null;
            }
        };
    }, [autoConnect, roomName]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        room,
        isConnected: connectionState === "connected",
        isConnecting: connectionState === "connecting",
        connectionState,
        participants,
        localParticipant,
        error,
        connect,
        disconnect,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        setAudioDevice,
        setVideoDevice,
    };
}

// ============================================================================
// STANDALONE FUNCTIONS (for use outside React)
// ============================================================================

/**
 * Create a LiveKit room instance with default options
 */
export function createRoom(options?: Partial<RoomOptions>): Room {
    return new Room({
        ...DEFAULT_ROOM_OPTIONS,
        ...options,
    });
}

/**
 * Connect to a LiveKit room (standalone, non-React usage)
 */
export async function connectToRoom(
    roomName: string,
    options?: Partial<RoomOptions>
): Promise<Room> {
    const { token } = await getVoiceToken(roomName);
    const room = createRoom(options);
    await room.connect(LIVEKIT_URL, token);
    return room;
}
