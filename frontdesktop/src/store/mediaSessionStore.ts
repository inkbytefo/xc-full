// ============================================================================
// Media Session Store - Unified Global Media State Management
// ============================================================================
// This store manages ALL media sessions across the application:
// - DM voice/video calls
// - Server voice/video channels
// - Live stream viewing
// - Screen share viewing
//
// Key principles:
// - Only ONE active session at a time
// - New session = previous session ends
// - PiP support for background viewing
// - Incoming call queue (WhatsApp-style)
// ============================================================================

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    ConnectionState,
    Track,
    type LocalTrackPublication,
    type RemoteTrackPublication,
} from "livekit-client";
import { newClientId } from "../lib/clientId";
import { playSound } from "../lib/soundService";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Media session types - mutually exclusive active states
 */
export type SessionType =
    | "idle"           // No active session
    | "dm-voice"       // DM voice call
    | "dm-video"       // DM video call  
    | "server-voice"   // Server voice channel
    | "server-video"   // Server hybrid channel (video mode)
    | "live-stream"    // Watching a live stream
    | "screen-share";  // Watching screen share in channel

/**
 * Context information for the current session
 */
export interface SessionContext {
    // DM call context
    conversationId?: string;
    otherUserId?: string;
    otherUserName?: string;
    otherUserAvatar?: [string, string];

    // Server channel context
    serverId?: string;
    serverName?: string;
    channelId?: string;
    channelName?: string;
    channelType?: "voice" | "video" | "hybrid";

    // Live stream context
    streamId?: string;
    streamerId?: string;
    streamerName?: string;
    streamTitle?: string;

    // Screen share context (who is sharing)
    sharingUserId?: string;
    sharingUserName?: string;
}

/**
 * Media control states
 */
export interface MediaControls {
    isMuted: boolean;
    isDeafened: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
}

/**
 * Picture-in-Picture state
 */
export interface PiPState {
    enabled: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

/**
 * Participant information for voice/video sessions
 */
export interface Participant {
    id: string;
    identity: string;
    sid: string;
    displayName: string;
    handle: string;
    avatarGradient: [string, string];
    isMuted: boolean;
    isSpeaking: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isLocal: boolean;
    // Video tracks (null if not publishing)
    cameraTrack?: Track | null;
    screenShareTrack?: Track | null;
}

/**
 * Incoming call data (WhatsApp-style queue)
 */
export interface IncomingCall {
    id: string;
    type: "voice" | "video";
    from: {
        userId: string;
        displayName: string;
        handle: string;
        avatarGradient: [string, string];
    };
    conversationId: string;
    timestamp: number;
    expiresAt: number; // Auto-reject after this time
}

/**
 * Connection states
 */
export type ConnectionStatus =
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting";

// ============================================================================
// STORE STATE
// ============================================================================

interface MediaSessionState {
    // Session info
    sessionType: SessionType;
    context: SessionContext;
    connection: ConnectionStatus;

    // Media controls
    media: MediaControls;

    // Participants (for voice/video)
    participants: Participant[];
    localParticipant: Participant | null;

    // PiP state
    pip: PiPState;

    // Incoming calls queue
    incomingCalls: IncomingCall[];

    // LiveKit room instance
    room: Room | null;

    // Error state
    error: string | null;

    // Instance ID for multi-window sync
    instanceId: string;
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

interface MediaSessionActions {
    // ─────────────────────────────────────────────────────────────────────
    // Session Management
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Start a DM voice or video call
     */
    startDMCall: (params: {
        conversationId: string;
        otherUserId: string;
        otherUserName: string;
        otherUserAvatar: [string, string];
        type: "voice" | "video";
    }) => Promise<void>;

    /**
     * Join a server voice/video channel
     */
    joinServerChannel: (params: {
        serverId: string;
        serverName: string;
        channelId: string;
        channelName: string;
        channelType: "voice" | "video" | "hybrid";
    }) => Promise<void>;

    /**
     * Start watching a live stream
     */
    watchLiveStream: (params: {
        streamId: string;
        streamerId: string;
        streamerName: string;
        streamTitle: string;
    }) => Promise<void>;

    /**
     * Start watching someone's screen share
     */
    watchScreenShare: (params: {
        serverId: string;
        channelId: string;
        sharingUserId: string;
        sharingUserName: string;
    }) => void;

    /**
     * End current session
     */
    endSession: () => Promise<void>;

    // ─────────────────────────────────────────────────────────────────────
    // Media Controls
    // ─────────────────────────────────────────────────────────────────────

    toggleMute: () => Promise<void>;
    toggleDeafen: () => void;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;

    // ─────────────────────────────────────────────────────────────────────
    // PiP Controls
    // ─────────────────────────────────────────────────────────────────────

    enablePiP: () => void;
    disablePiP: () => void;
    updatePiPPosition: (x: number, y: number) => void;
    updatePiPSize: (width: number, height: number) => void;

    // ─────────────────────────────────────────────────────────────────────
    // Incoming Call Management
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Add incoming call to queue (called by WebSocket handler)
     */
    receiveIncomingCall: (call: Omit<IncomingCall, "timestamp" | "expiresAt">) => void;

    /**
     * Accept an incoming call (ends current session if any)
     */
    acceptCall: (callId: string) => Promise<void>;

    /**
     * Reject/dismiss an incoming call
     */
    rejectCall: (callId: string) => void;

    /**
     * Remove expired calls from queue
     */
    cleanupExpiredCalls: () => void;

    // ─────────────────────────────────────────────────────────────────────
    // Internal Methods
    // ─────────────────────────────────────────────────────────────────────

    updateParticipants: () => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880";
const CALL_TIMEOUT_MS = 30000; // 30 seconds

const DEFAULT_PIP_SIZE = { width: 320, height: 180 };
const DEFAULT_PIP_POSITION = { x: window.innerWidth - 340, y: window.innerHeight - 220 };

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

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MediaSessionState = {
    sessionType: "idle",
    context: {},
    connection: "disconnected",
    media: {
        isMuted: false,
        isDeafened: false,
        isCameraOn: false,
        isScreenSharing: false,
    },
    participants: [],
    localParticipant: null,
    pip: {
        enabled: false,
        position: DEFAULT_PIP_POSITION,
        size: DEFAULT_PIP_SIZE,
    },
    incomingCalls: [],
    room: null,
    error: null,
    instanceId: newClientId(),
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useMediaSessionStore = create<MediaSessionState & MediaSessionActions>()(
    subscribeWithSelector((set, get) => {
        // ─────────────────────────────────────────────────────────────────
        // Internal: Connect to LiveKit room
        // ─────────────────────────────────────────────────────────────────
        const connectToRoom = async (
            roomName: string,
            sessionType: SessionType,
            context: SessionContext
        ): Promise<void> => {
            const { room: existingRoom } = get();

            // Cleanup existing room
            if (existingRoom) {
                existingRoom.removeAllListeners();
                await existingRoom.disconnect();
            }

            set({
                sessionType,
                context,
                connection: "connecting",
                error: null,
            });

            try {
                let token = "";

                // Get token based on session type
                if (sessionType.startsWith("dm-")) {
                    // Calls use call ID for token generation
                    // The roomName param here is actually passed as conversationId/callId depending on context,
                    // but for startDMCall we need the callId that was returned from initiate or accept.
                    // However, startDMCall needs to initiate the call first to get the callId...
                    // Actually, let's refactor startDMCall to handle the API call itself.
                    // But here we need to know WHERE the token comes from.
                    // Let's passed the token directly if possible or fetch it.

                    // REFACTOR: startDMCall handles the API logic to get callId.
                    // Here we simply need to connect.
                    // Let's assume for DM calls, we need a separate way to get the token or pass it in.
                    // Actually, better approach:
                    // connectToRoom should take a token, OR we fetch it inside based on ID.
                    // For DMs, we have getCallToken(callId).
                    // We need the callId in context.

                    // TEMP: For now, we will handle token fetching inside the specific actions (startDMCall/joinServerChannel)
                    // and pass the token to a lower-level connect function?
                    // OR keep it here and switch on session type.
                }

                if (sessionType.startsWith("server-")) {
                    const { getVoiceToken } = await import("../features/media-session/api/serverVoiceApi");
                    const res = await getVoiceToken(roomName); // roomName is channelId here
                    token = res.token;
                } else if (sessionType.startsWith("dm-")) {
                    // Check if we have a callId in context (we should for acceptCall)
                    // But startDMCall initiates a new call.
                    // We need to fetch the token.
                    const { getCallToken } = await import("../features/media-session/api/dmCallApi");
                    // For DMs, roomName is used as callId in this implementation plan?
                    // Let's look at startDMCall implementation.
                    const res = await getCallToken(roomName);
                    token = res.token;
                }

                const room = new Room({
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
                });

                // Setup event handlers
                const updateParticipants = () => get().updateParticipants();

                room.on(RoomEvent.Connected, () => {
                    set({ connection: "connected" });
                    playSound("voice_connect");
                    updateParticipants();
                });

                room.on(RoomEvent.Disconnected, () => {
                    set({
                        connection: "disconnected",
                        participants: [],
                        localParticipant: null,
                        room: null,
                    });
                });

                room.on(RoomEvent.ParticipantConnected, () => {
                    playSound("voice_join");
                    updateParticipants();
                });

                room.on(RoomEvent.ParticipantDisconnected, () => {
                    playSound("voice_leave");
                    updateParticipants();
                });

                room.on(RoomEvent.ActiveSpeakersChanged, updateParticipants);
                room.on(RoomEvent.TrackMuted, updateParticipants);
                room.on(RoomEvent.TrackUnmuted, updateParticipants);
                room.on(RoomEvent.TrackSubscribed, updateParticipants);
                room.on(RoomEvent.TrackUnsubscribed, updateParticipants);
                room.on(RoomEvent.LocalTrackPublished, updateParticipants);
                room.on(RoomEvent.LocalTrackUnpublished, updateParticipants);

                room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                    const mapped: ConnectionStatus =
                        state === ConnectionState.Connected
                            ? "connected"
                            : state === ConnectionState.Connecting
                                ? "connecting"
                                : state === ConnectionState.Reconnecting
                                    ? "reconnecting"
                                    : "disconnected";
                    set({ connection: mapped });
                });

                // Connect to room
                await room.connect(LIVEKIT_URL, token);

                // Enable microphone by default for voice sessions
                if (sessionType !== "live-stream" && sessionType !== "screen-share") {
                    await room.localParticipant.setMicrophoneEnabled(true);
                }

                set({ room, connection: "connected" });
                updateParticipants();

            } catch (err) {
                console.error("[MediaSession] Connection error:", err);
                set({
                    connection: "disconnected",
                    error: err instanceof Error ? err.message : "Connection failed",
                    sessionType: "idle",
                    context: {},
                });
                throw err;
            }
        };

        // ─────────────────────────────────────────────────────────────────
        // Return store
        // ─────────────────────────────────────────────────────────────────
        return {
            ...initialState,

            // ═══════════════════════════════════════════════════════════════
            // SESSION MANAGEMENT
            // ═══════════════════════════════════════════════════════════════

            startDMCall: async (params) => {
                // End any existing session first
                await get().endSession();

                // Import initiateCall dynamically to avoid cycle if possible, or just use fetch
                const { api } = await import("../api/client");

                // 1. Initiate call
                const res = await api.post<{ data: { callId: string; roomName: string } }>(
                    "/api/v1/calls/initiate",
                    { calleeId: params.otherUserId, callType: params.type }
                );

                const { callId } = res.data;

                const sessionType: SessionType = params.type === "video" ? "dm-video" : "dm-voice";
                const context: SessionContext = {
                    conversationId: params.conversationId,
                    otherUserId: params.otherUserId,
                    otherUserName: params.otherUserName,
                    otherUserAvatar: params.otherUserAvatar,
                };

                // 2. Connect using the new Call ID
                await connectToRoom(callId, sessionType, context);
            },

            joinServerChannel: async (params) => {
                // End any existing session first
                await get().endSession();

                const sessionType: SessionType =
                    params.channelType === "video" || params.channelType === "hybrid"
                        ? "server-video"
                        : "server-voice";

                const context: SessionContext = {
                    serverId: params.serverId,
                    serverName: params.serverName,
                    channelId: params.channelId,
                    channelName: params.channelName,
                    channelType: params.channelType,
                };

                await connectToRoom(params.channelId, sessionType, context);
            },

            watchLiveStream: async (params) => {
                // End any existing session first
                await get().endSession();

                const context: SessionContext = {
                    streamId: params.streamId,
                    streamerId: params.streamerId,
                    streamerName: params.streamerName,
                    streamTitle: params.streamTitle,
                };

                await connectToRoom(params.streamId, "live-stream", context);
            },

            watchScreenShare: (params) => {
                // Screen share viewing doesn't require its own room connection
                // We're just focusing the view on someone's screen share
                set({
                    sessionType: "screen-share",
                    context: {
                        serverId: params.serverId,
                        channelId: params.channelId,
                        sharingUserId: params.sharingUserId,
                        sharingUserName: params.sharingUserName,
                    },
                });
            },

            endSession: async () => {
                const { room, sessionType } = get();

                if (room) {
                    room.removeAllListeners();
                    await room.disconnect();
                }

                // Don't reset PiP position/size - user preference
                const currentPip = get().pip;

                set({
                    ...initialState,
                    pip: {
                        ...currentPip,
                        enabled: false,
                    },
                    incomingCalls: get().incomingCalls, // Preserve call queue
                    instanceId: get().instanceId,
                });

                if (sessionType !== "idle") {
                    playSound("voice_leave");
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // MEDIA CONTROLS
            // ═══════════════════════════════════════════════════════════════

            toggleMute: async () => {
                const { room, media } = get();
                if (!room) return;

                const newMuted = !media.isMuted;
                await room.localParticipant.setMicrophoneEnabled(!newMuted);

                set({
                    media: { ...media, isMuted: newMuted },
                });
            },

            toggleDeafen: () => {
                const { media } = get();
                set({
                    media: { ...media, isDeafened: !media.isDeafened },
                });
                // Note: Deafen is client-side only, we'd need to mute all remote audio
            },

            toggleCamera: async () => {
                const { room, media } = get();
                if (!room) return;

                const newCameraOn = !media.isCameraOn;
                await room.localParticipant.setCameraEnabled(newCameraOn);

                set({
                    media: { ...media, isCameraOn: newCameraOn },
                });
            },

            toggleScreenShare: async () => {
                const { room, media } = get();
                if (!room) return;

                const newScreenSharing = !media.isScreenSharing;
                await room.localParticipant.setScreenShareEnabled(newScreenSharing);

                set({
                    media: { ...media, isScreenSharing: newScreenSharing },
                });
            },

            // ═══════════════════════════════════════════════════════════════
            // PIP CONTROLS
            // ═══════════════════════════════════════════════════════════════

            enablePiP: () => {
                set((state) => ({
                    pip: { ...state.pip, enabled: true },
                }));
            },

            disablePiP: () => {
                set((state) => ({
                    pip: { ...state.pip, enabled: false },
                }));
            },

            updatePiPPosition: (x, y) => {
                set((state) => ({
                    pip: { ...state.pip, position: { x, y } },
                }));
            },

            updatePiPSize: (width, height) => {
                set((state) => ({
                    pip: { ...state.pip, size: { width, height } },
                }));
            },

            // ═══════════════════════════════════════════════════════════════
            // INCOMING CALL MANAGEMENT
            // ═══════════════════════════════════════════════════════════════

            receiveIncomingCall: (call) => {
                const now = Date.now();
                const incomingCall: IncomingCall = {
                    ...call,
                    timestamp: now,
                    expiresAt: now + CALL_TIMEOUT_MS,
                };

                set((state) => ({
                    incomingCalls: [...state.incomingCalls, incomingCall],
                }));

                // Play ringtone
                playSound("ringtone");

                // Schedule auto-cleanup
                setTimeout(() => {
                    get().cleanupExpiredCalls();
                }, CALL_TIMEOUT_MS + 100);
            },

            acceptCall: async (callId) => {
                const { incomingCalls } = get();
                const call = incomingCalls.find((c) => c.id === callId);

                if (!call) {
                    console.warn("[MediaSession] Call not found:", callId);
                    return;
                }

                // Remove from queue
                set((state) => ({
                    incomingCalls: state.incomingCalls.filter((c) => c.id !== callId),
                }));

                // Start the DM call
                await get().startDMCall({
                    conversationId: call.conversationId,
                    otherUserId: call.from.userId,
                    otherUserName: call.from.displayName,
                    otherUserAvatar: call.from.avatarGradient,
                    type: call.type,
                });
            },

            rejectCall: (callId) => {
                set((state) => ({
                    incomingCalls: state.incomingCalls.filter((c) => c.id !== callId),
                }));

                // TODO: Send reject notification to caller via WebSocket
            },

            cleanupExpiredCalls: () => {
                const now = Date.now();
                set((state) => ({
                    incomingCalls: state.incomingCalls.filter((c) => c.expiresAt > now),
                }));
            },

            // ═══════════════════════════════════════════════════════════════
            // INTERNAL METHODS
            // ═══════════════════════════════════════════════════════════════

            updateParticipants: () => {
                const { room } = get();
                if (!room) return;

                const participants: Participant[] = [];

                // Local participant
                const local = room.localParticipant;
                const localMeta = parseMetadata(local.metadata);
                const localInfo: Participant = {
                    id: local.sid,
                    identity: local.identity,
                    sid: local.sid,
                    displayName: localMeta.displayName,
                    handle: localMeta.handle,
                    avatarGradient: localMeta.avatarGradient,
                    isMuted: !local.isMicrophoneEnabled,
                    isSpeaking: local.isSpeaking,
                    isCameraOn: local.isCameraEnabled,
                    isScreenSharing: hasScreenShare(
                        local.trackPublications as unknown as Map<string, LocalTrackPublication>
                    ),
                    isLocal: true,
                    cameraTrack: getVideoTrack(
                        local.trackPublications as unknown as Map<string, LocalTrackPublication>
                    ),
                    screenShareTrack: getScreenShareTrack(
                        local.trackPublications as unknown as Map<string, LocalTrackPublication>
                    ),
                };
                participants.push(localInfo);

                // Remote participants
                room.remoteParticipants.forEach((p: RemoteParticipant) => {
                    const meta = parseMetadata(p.metadata);
                    participants.push({
                        id: p.sid,
                        identity: p.identity,
                        sid: p.sid,
                        displayName: meta.displayName,
                        handle: meta.handle,
                        avatarGradient: meta.avatarGradient,
                        isMuted: !p.isMicrophoneEnabled,
                        isSpeaking: p.isSpeaking,
                        isCameraOn: p.isCameraEnabled,
                        isScreenSharing: hasScreenShare(
                            p.trackPublications as unknown as Map<string, RemoteTrackPublication>
                        ),
                        isLocal: false,
                        cameraTrack: getVideoTrack(
                            p.trackPublications as unknown as Map<string, RemoteTrackPublication>
                        ),
                        screenShareTrack: getScreenShareTrack(
                            p.trackPublications as unknown as Map<string, RemoteTrackPublication>
                        ),
                    });
                });

                set({
                    participants,
                    localParticipant: localInfo,
                    media: {
                        isMuted: !local.isMicrophoneEnabled,
                        isDeafened: get().media.isDeafened,
                        isCameraOn: local.isCameraEnabled,
                        isScreenSharing: hasScreenShare(
                            local.trackPublications as unknown as Map<string, LocalTrackPublication>
                        ),
                    },
                });
            },

            setError: (error) => set({ error }),

            reset: () => set(initialState),
        };
    })
);

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

export const selectIsActive = (state: MediaSessionState) => state.sessionType !== "idle";
export const selectIsVoiceSession = (state: MediaSessionState) =>
    ["dm-voice", "dm-video", "server-voice", "server-video"].includes(state.sessionType);
export const selectIsViewingContent = (state: MediaSessionState) =>
    ["live-stream", "screen-share"].includes(state.sessionType);
export const selectHasIncomingCalls = (state: MediaSessionState) => state.incomingCalls.length > 0;
