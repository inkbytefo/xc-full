import { create } from "zustand";
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    ConnectionState,
    Track,
    type LocalTrackPublication,
    type RemoteTrackPublication,
} from "livekit-client";
import { getVoiceToken, type VoiceChannel } from "../features/voice/voiceApi";
import { newClientId } from "../lib/clientId";
import { useUIStore } from "./uiStore";

export interface ParticipantInfo {
    identity: string;
    sid: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isLocal: boolean;
    cameraTrack?: Track | null;
    screenShareTrack?: Track | null;
}

type VoiceRuntimeRole = "owner" | "follower";

type VoiceCommandType =
    | "connect"
    | "disconnect"
    | "toggleMute"
    | "toggleDeafen"
    | "toggleCamera"
    | "toggleScreenShare"
    | "setDevices";

export interface AudioDevicePreferences {
    audioInputId: string | null;
    audioOutputId: string | null;
}

interface VoiceStateSnapshot {
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: "connected" | "connecting" | "reconnecting" | "disconnected";
    isMuted: boolean;
    isDeafened: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    error: string | null;
    participants: Array<Omit<ParticipantInfo, "cameraTrack" | "screenShareTrack">>;
    localParticipant: Omit<ParticipantInfo, "cameraTrack" | "screenShareTrack"> | null;
    activeChannelId: string | null;
    activeChannel: VoiceChannel | null;
    devices: AudioDevicePreferences;
}

type VoiceBusMessage =
    | {
        kind: "voice/heartbeat";
        from: string;
        ts: number;
        id: string;
    }
    | {
        kind: "voice/state";
        from: string;
        ts: number;
        id: string;
        payload: VoiceStateSnapshot;
    }
    | {
        kind: "voice/command";
        from: string;
        ts: number;
        id: string;
        payload: { type: VoiceCommandType; channel?: VoiceChannel; devices?: AudioDevicePreferences };
    };

interface VoiceState {
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: "connected" | "connecting" | "reconnecting" | "disconnected";
    isMuted: boolean;
    isDeafened: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    error: string | null;
    participants: ParticipantInfo[];
    localParticipant: ParticipantInfo | null;
    activeChannelId: string | null;
    activeChannel: VoiceChannel | null;
    room: Room | null;

    runtimeRole: VoiceRuntimeRole;
    runtimeInstanceId: string;
    ownerInstanceId: string | null;
    ownerLastSeenAt: number | null;
    ownerAvailable: boolean;

    initRuntime: (role?: VoiceRuntimeRole) => void;
    connect: (channel: VoiceChannel) => Promise<void>;
    disconnect: () => void;
    toggleMute: () => Promise<void>;
    toggleDeafen: () => void;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    setAudioDevices: (devices: AudioDevicePreferences) => Promise<void>;
    updateParticipants: () => void;
}

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880";
const VOICE_BUS_NAME = "xc-voice-bus-v1";
const OWNER_HEARTBEAT_MS = 1500;
const OWNER_STALE_MS = 5000;
const SNAPSHOT_THROTTLE_MS = 150;

let voiceBus: BroadcastChannel | null = null;
let voiceBusRole: VoiceRuntimeRole | null = null;
let voiceBusInstanceId: string | null = null;
let heartbeatTimer: number | null = null;
let snapshotTimer: number | null = null;
let lastSnapshotSentAt = 0;

function isBroadcastChannelSupported(): boolean {
    return typeof BroadcastChannel !== "undefined";
}

function inferRuntimeRole(): VoiceRuntimeRole {
    const rootEl = typeof document !== "undefined" ? document.getElementById("overlay-root") : null;
    if (rootEl) return "follower";
    return "owner";
}

function nowMs(): number {
    return Date.now();
}

function ensureVoiceBus(): BroadcastChannel | null {
    if (!isBroadcastChannelSupported()) return null;
    if (voiceBus) return voiceBus;
    voiceBus = new BroadcastChannel(VOICE_BUS_NAME);
    return voiceBus;
}

function isOwnerAlive(ownerLastSeenAt: number | null): boolean {
    if (!ownerLastSeenAt) return false;
    return nowMs() - ownerLastSeenAt <= OWNER_STALE_MS;
}

function toSnapshot(state: VoiceState): VoiceStateSnapshot {
    const ui = useUIStore.getState();
    const participants = state.participants.map((p) => ({
        identity: p.identity,
        sid: p.sid,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted,
        isCameraOn: p.isCameraOn,
        isScreenSharing: p.isScreenSharing,
        isLocal: p.isLocal,
    }));

    const localParticipant = state.localParticipant
        ? {
            identity: state.localParticipant.identity,
            sid: state.localParticipant.sid,
            isSpeaking: state.localParticipant.isSpeaking,
            isMuted: state.localParticipant.isMuted,
            isCameraOn: state.localParticipant.isCameraOn,
            isScreenSharing: state.localParticipant.isScreenSharing,
            isLocal: state.localParticipant.isLocal,
        }
        : null;

    return {
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        connectionState: state.connectionState,
        isMuted: state.isMuted,
        isDeafened: state.isDeafened,
        isCameraOn: state.isCameraOn,
        isScreenSharing: state.isScreenSharing,
        error: state.error,
        participants,
        localParticipant,
        activeChannelId: state.activeChannelId,
        activeChannel: state.activeChannel,
        devices: {
            audioInputId: ui.audioInputDeviceId,
            audioOutputId: ui.audioOutputDeviceId,
        },
    };
}

function postBusMessage(msg: VoiceBusMessage) {
    const bc = ensureVoiceBus();
    if (bc) {
        bc.postMessage(msg);
        return;
    }
    void import("@tauri-apps/api/event")
        .then(({ emit }) => emit(VOICE_BUS_NAME, msg))
        .catch(() => { });
}

export const useVoiceStore = create<VoiceState>((set, get) => {
    const getTrack = (publications: Map<string, LocalTrackPublication | RemoteTrackPublication>): Track | null => {
        for (const pub of publications.values()) {
            if (pub.track && pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
                return pub.track as Track;
            }
        }
        return null;
    };

    const getScreenShareTrack = (
        publications: Map<string, LocalTrackPublication | RemoteTrackPublication>
    ): Track | null => {
        for (const pub of publications.values()) {
            if (pub.track && pub.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
                return pub.track as Track;
            }
        }
        return null;
    };

    const hasScreenShare = (publications: Map<string, LocalTrackPublication | RemoteTrackPublication>): boolean => {
        for (const pub of publications.values()) {
            if (pub.track && pub.source === Track.Source.ScreenShare) {
                return true;
            }
        }
        return false;
    };

    const publishSnapshot = () => {
        if (get().runtimeRole !== "owner") return;
        const bc = ensureVoiceBus();
        if (!bc) return;
        if (!voiceBusInstanceId) return;

        const elapsed = nowMs() - lastSnapshotSentAt;
        if (elapsed >= SNAPSHOT_THROTTLE_MS) {
            lastSnapshotSentAt = nowMs();
            postBusMessage({
                kind: "voice/state",
                from: voiceBusInstanceId,
                ts: nowMs(),
                id: newClientId(),
                payload: toSnapshot(get()),
            });
            return;
        }

        if (snapshotTimer !== null) return;
        snapshotTimer = window.setTimeout(() => {
            snapshotTimer = null;
            lastSnapshotSentAt = nowMs();
            postBusMessage({
                kind: "voice/state",
                from: voiceBusInstanceId!,
                ts: nowMs(),
                id: newClientId(),
                payload: toSnapshot(get()),
            });
        }, SNAPSHOT_THROTTLE_MS - elapsed);
    };

    const ensureOwnerAvailableOrSetError = (): boolean => {
        const { ownerLastSeenAt } = get();
        if (isOwnerAlive(ownerLastSeenAt)) return true;
        set({ ownerAvailable: false, error: "Ana uygulama aktif değil." });
        return false;
    };

    const sendCommand = (type: VoiceCommandType, channel?: VoiceChannel, devices?: AudioDevicePreferences) => {
        if (!voiceBusInstanceId) return;
        postBusMessage({
            kind: "voice/command",
            from: voiceBusInstanceId,
            ts: nowMs(),
            id: newClientId(),
            payload: { type, channel, devices },
        });
    };

    const applyDevicesForOwner = async (devices: AudioDevicePreferences) => {
        const room = get().room;
        if (!room) return;

        const roomWithSwitch = room as unknown as {
            switchActiveDevice?: (kind: "audioinput" | "audiooutput", deviceId: string) => Promise<void>;
        };

        const audioInputId = devices.audioInputId ?? "default";
        const audioOutputId = devices.audioOutputId ?? "default";

        try {
            if (roomWithSwitch.switchActiveDevice) {
                await roomWithSwitch.switchActiveDevice("audioinput", audioInputId);
            }
        } catch (err) {
            console.error("Failed to switch audio input device:", err);
        }

        try {
            if (roomWithSwitch.switchActiveDevice) {
                await roomWithSwitch.switchActiveDevice("audiooutput", audioOutputId);
            }
        } catch (err) {
            console.error("Failed to switch audio output device:", err);
        }
    };

    const processedCommandIds = new Set<string>();
    const processedCommandIdQueue: string[] = [];
    const rememberCommandId = (id: string): boolean => {
        if (processedCommandIds.has(id)) return false;
        processedCommandIds.add(id);
        processedCommandIdQueue.push(id);
        if (processedCommandIdQueue.length > 256) {
            const oldest = processedCommandIdQueue.shift();
            if (oldest) processedCommandIds.delete(oldest);
        }
        return true;
    };

    let desiredChannel: VoiceChannel | null = null;
    let reconnectAttempt = 0;
    let reconnectTimerId: number | null = null;
    let reconnectInProgress = false;

    const clearReconnectTimer = () => {
        if (reconnectTimerId === null) return;
        window.clearTimeout(reconnectTimerId);
        reconnectTimerId = null;
    };

    const scheduleReconnect = () => {
        if (get().runtimeRole !== "owner") return;
        if (!desiredChannel) return;
        if (reconnectTimerId !== null) return;

        const attempt = reconnectAttempt;
        const baseDelay = Math.min(15000, 800 * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * 250);
        const delayMs = baseDelay + jitter;
        reconnectTimerId = window.setTimeout(() => {
            reconnectTimerId = null;
            void get().connect(desiredChannel as VoiceChannel);
        }, delayMs);
        reconnectAttempt = Math.min(10, reconnectAttempt + 1);
    };

    const ensureTauriListener = (onMessage: (msg: VoiceBusMessage) => void) => {
        void import("@tauri-apps/api/event")
            .then(async ({ listen }) => {
                await listen<VoiceBusMessage>(VOICE_BUS_NAME, (event) => {
                    onMessage(event.payload);
                });
            })
            .catch(() => { });
    };

    const initRuntime = (role?: VoiceRuntimeRole) => {
        if (voiceBusRole) return;

        const effectiveRole: VoiceRuntimeRole = role ?? inferRuntimeRole();
        voiceBusRole = effectiveRole;
        voiceBusInstanceId = newClientId();

        const bc = ensureVoiceBus();
        const handleBusMessage = (data: VoiceBusMessage) => {
            if (!data || typeof data !== "object") return;
            if (data.kind !== "voice/heartbeat" && data.kind !== "voice/state" && data.kind !== "voice/command") return;
            if (!voiceBusInstanceId) return;
            if (data.from === voiceBusInstanceId) return;

            if (voiceBusRole === "owner" && data.kind === "voice/command") {
                if (!rememberCommandId(data.id)) return;

                const { type, channel } = data.payload;
                if (type === "connect" && channel) {
                    get().connect(channel).catch(() => { });
                    return;
                }
                if (type === "disconnect") {
                    get().disconnect();
                    return;
                }
                if (type === "toggleMute") {
                    get().toggleMute().catch(() => { });
                    return;
                }
                if (type === "toggleDeafen") {
                    get().toggleDeafen();
                    return;
                }
                if (type === "toggleCamera") {
                    get().toggleCamera().catch(() => { });
                    return;
                }
                if (type === "toggleScreenShare") {
                    get().toggleScreenShare().catch(() => { });
                    return;
                }
                if (type === "setDevices" && data.payload.devices) {
                    get().setAudioDevices(data.payload.devices).catch(() => { });
                    return;
                }
                return;
            }

            if (voiceBusRole === "follower" && data.kind === "voice/heartbeat") {
                const lastSeenAt = data.ts;
                set({
                    ownerInstanceId: data.from,
                    ownerLastSeenAt: lastSeenAt,
                    ownerAvailable: isOwnerAlive(lastSeenAt),
                });
                return;
            }

            if (voiceBusRole === "follower" && data.kind === "voice/state") {
                const snap = data.payload;
                set({
                    isConnected: snap.isConnected,
                    isConnecting: snap.isConnecting,
                    connectionState: snap.connectionState,
                    isMuted: snap.isMuted,
                    isDeafened: snap.isDeafened,
                    isCameraOn: snap.isCameraOn,
                    isScreenSharing: snap.isScreenSharing,
                    error: snap.error,
                    participants: snap.participants as ParticipantInfo[],
                    localParticipant: snap.localParticipant as ParticipantInfo | null,
                    activeChannelId: snap.activeChannelId,
                    activeChannel: snap.activeChannel,
                    room: null,
                    ownerInstanceId: data.from,
                    ownerLastSeenAt: data.ts,
                    ownerAvailable: isOwnerAlive(data.ts),
                });
                const ui = useUIStore.getState();
                ui.setAudioInputDeviceId(snap.devices?.audioInputId ?? null);
                ui.setAudioOutputDeviceId(snap.devices?.audioOutputId ?? null);
            }
        };

        if (bc) {
            bc.onmessage = (event: MessageEvent<unknown>) => {
                handleBusMessage(event.data as VoiceBusMessage);
            };
        } else {
            ensureTauriListener(handleBusMessage);
        }

        set({
            runtimeRole: effectiveRole,
            runtimeInstanceId: voiceBusInstanceId,
            ownerAvailable: effectiveRole === "owner",
        });

        if (effectiveRole === "owner") {
            if (heartbeatTimer === null) {
                heartbeatTimer = window.setInterval(() => {
                    if (!voiceBusInstanceId) return;
                    postBusMessage({
                        kind: "voice/heartbeat",
                        from: voiceBusInstanceId,
                        ts: nowMs(),
                        id: newClientId(),
                    });
                }, OWNER_HEARTBEAT_MS);
            }
            postBusMessage({
                kind: "voice/heartbeat",
                from: voiceBusInstanceId,
                ts: nowMs(),
                id: newClientId(),
            });
            publishSnapshot();
        }
    };

    return {
        isConnected: false,
        isConnecting: false,
        connectionState: "disconnected",
        isMuted: false,
        isDeafened: false,
        isCameraOn: false,
        isScreenSharing: false,
        error: null,
        participants: [],
        localParticipant: null,
        activeChannelId: null,
        activeChannel: null,
        room: null,
        runtimeRole: inferRuntimeRole(),
        runtimeInstanceId: newClientId(),
        ownerInstanceId: null,
        ownerLastSeenAt: null,
        ownerAvailable: false,

        initRuntime,

        updateParticipants: () => {
            const { room } = get();
            if (!room) return;

            const participants: ParticipantInfo[] = [];

            const local = room.localParticipant;
            const localTrack = getTrack(local.trackPublications as unknown as Map<string, LocalTrackPublication>);
            const localScreenShareTrack = getScreenShareTrack(
                local.trackPublications as unknown as Map<string, LocalTrackPublication>
            );
            const localInfo: ParticipantInfo = {
                identity: local.identity,
                sid: local.sid,
                isSpeaking: local.isSpeaking,
                isMuted: !local.isMicrophoneEnabled,
                isCameraOn: local.isCameraEnabled,
                isScreenSharing: hasScreenShare(local.trackPublications as unknown as Map<string, LocalTrackPublication>),
                isLocal: true,
                cameraTrack: localTrack,
                screenShareTrack: localScreenShareTrack,
            };
            participants.push(localInfo);

            room.remoteParticipants.forEach((p: RemoteParticipant) => {
                const track = getTrack(p.trackPublications as unknown as Map<string, RemoteTrackPublication>);
                const screenShareTrack = getScreenShareTrack(
                    p.trackPublications as unknown as Map<string, RemoteTrackPublication>
                );
                participants.push({
                    identity: p.identity,
                    sid: p.sid,
                    isSpeaking: p.isSpeaking,
                    isMuted: !p.isMicrophoneEnabled,
                    isCameraOn: p.isCameraEnabled,
                    isScreenSharing: hasScreenShare(p.trackPublications as unknown as Map<string, RemoteTrackPublication>),
                    isLocal: false,
                    cameraTrack: track,
                    screenShareTrack,
                });
            });

            set({
                participants,
                localParticipant: localInfo,
                isCameraOn: local.isCameraEnabled,
                isScreenSharing: hasScreenShare(local.trackPublications as unknown as Map<string, LocalTrackPublication>),
                isMuted: !local.isMicrophoneEnabled,
            });
            publishSnapshot();
        },

        connect: async (channel) => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);
            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                set({
                    isConnecting: true,
                    error: null,
                    activeChannelId: channel.id,
                    activeChannel: channel,
                });
                sendCommand("connect", channel);
                return;
            }

            desiredChannel = channel;
            clearReconnectTimer();
            const isReconnectAttempt = get().connectionState === "reconnecting";
            if (!isReconnectAttempt) {
                reconnectAttempt = 0;
            }

            const { room: existingRoom } = get();

            if (get().activeChannelId === channel.id && (get().isConnected || get().isConnecting)) {
                return;
            }

            if (existingRoom) {
                existingRoom.removeAllListeners();
                existingRoom.disconnect();
            }

            reconnectInProgress = isReconnectAttempt;
            set({
                isConnecting: true,
                connectionState: reconnectInProgress ? "reconnecting" : "connecting",
                error: null,
                activeChannelId: channel.id,
                activeChannel: channel,
            });
            publishSnapshot();

            try {
                const { token } = await getVoiceToken(channel.id);

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

                const up = () => get().updateParticipants();

                room.on(RoomEvent.Connected, () => {
                    set({ isConnected: true, isConnecting: false });
                    reconnectInProgress = false;
                    up();
                    publishSnapshot();
                });

                room.on(RoomEvent.Disconnected, () => {
                    const shouldReconnect = !!desiredChannel && desiredChannel.id === channel.id;

                    set({
                        isConnected: false,
                        isCameraOn: false,
                        isScreenSharing: false,
                        participants: [],
                        localParticipant: null,
                        room: null,
                        isConnecting: shouldReconnect,
                        activeChannelId: shouldReconnect ? channel.id : null,
                        activeChannel: shouldReconnect ? channel : null,
                        connectionState: shouldReconnect ? "reconnecting" : "disconnected",
                        error: shouldReconnect ? "Bağlantı koptu, yeniden bağlanılıyor..." : null,
                    });
                    publishSnapshot();

                    if (shouldReconnect) {
                        reconnectInProgress = true;
                        scheduleReconnect();
                    }
                });

                room.on(RoomEvent.ParticipantConnected, up);
                room.on(RoomEvent.ParticipantDisconnected, up);
                room.on(RoomEvent.ActiveSpeakersChanged, up);
                room.on(RoomEvent.TrackMuted, up);
                room.on(RoomEvent.TrackUnmuted, up);
                room.on(RoomEvent.TrackSubscribed, up);
                room.on(RoomEvent.TrackUnsubscribed, up);
                room.on(RoomEvent.LocalTrackPublished, up);
                room.on(RoomEvent.LocalTrackUnpublished, up);

                room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                    const mapped =
                        state === ConnectionState.Connected
                            ? "connected"
                            : state === ConnectionState.Connecting
                                ? "connecting"
                                : state === ConnectionState.Reconnecting
                                    ? "reconnecting"
                                    : "disconnected";
                    set({
                        connectionState: mapped,
                        isConnecting: mapped === "connecting" || mapped === "reconnecting",
                        isConnected: mapped === "connected",
                    });
                    if (state === ConnectionState.Disconnected) {
                        publishSnapshot();
                    }
                });

                await room.connect(LIVEKIT_URL, token);
                await room.localParticipant.setMicrophoneEnabled(true);

                set({ room, connectionState: "connected" });
                const uiState = useUIStore.getState();
                await applyDevicesForOwner({
                    audioInputId: uiState.audioInputDeviceId,
                    audioOutputId: uiState.audioOutputDeviceId,
                });
                publishSnapshot();

            } catch (err) {
                console.error("Global Voice Error:", err);
                const shouldReconnect = !!desiredChannel && desiredChannel.id === channel.id;
                if (shouldReconnect) {
                    reconnectInProgress = true;
                    set({
                        isConnecting: true,
                        connectionState: "reconnecting",
                        error: err instanceof Error ? err.message : "Connection failed",
                        activeChannelId: channel.id,
                        activeChannel: channel,
                        room: null,
                    });
                    publishSnapshot();
                    scheduleReconnect();
                } else {
                    reconnectInProgress = false;
                    set({
                        isConnecting: false,
                        error: err instanceof Error ? err.message : "Connection failed",
                        activeChannelId: null,
                        activeChannel: null
                    });
                    publishSnapshot();
                }
            }
        },

        disconnect: () => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);
            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                set({
                    isConnected: false,
                    isConnecting: false,
                    error: null,
                    participants: [],
                    localParticipant: null,
                    activeChannelId: null,
                    activeChannel: null,
                    room: null,
                });
                sendCommand("disconnect");
                return;
            }

            desiredChannel = null;
            reconnectAttempt = 0;
            reconnectInProgress = false;
            clearReconnectTimer();

            const { room } = get();
            if (room) {
                room.removeAllListeners();
                room.disconnect();
            }
            set({
                isConnected: false,
                isConnecting: false,
                isMuted: false,
                isDeafened: false,
                isCameraOn: false,
                isScreenSharing: false,
                connectionState: "disconnected",
                error: null,
                participants: [],
                localParticipant: null,
                activeChannelId: null,
                activeChannel: null,
                room: null,
            });
            publishSnapshot();
        },

        toggleMute: async () => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);
            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                const newMuted = !get().isMuted;
                set({ isMuted: newMuted });
                sendCommand("toggleMute");
                return;
            }

            const { room } = get();
            if (!room) return;
            const newMuted = !get().isMuted;
            await room.localParticipant.setMicrophoneEnabled(!newMuted);
            set({ isMuted: newMuted });
            get().updateParticipants();
            publishSnapshot();
        },

        setAudioDevices: async (devices) => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);

            const normalized: AudioDevicePreferences = {
                audioInputId: devices.audioInputId ?? null,
                audioOutputId: devices.audioOutputId ?? null,
            };

            const ui = useUIStore.getState();
            ui.setAudioInputDeviceId(normalized.audioInputId);
            ui.setAudioOutputDeviceId(normalized.audioOutputId);

            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                sendCommand("setDevices", undefined, normalized);
                return;
            }

            await applyDevicesForOwner(normalized);
            publishSnapshot();
        },

        toggleDeafen: () => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);
            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                const newDeafened = !get().isDeafened;
                set({ isDeafened: newDeafened });
                sendCommand("toggleDeafen");
                return;
            }

            const { room, isDeafened } = get();
            if (!room) return;
            const newDeafened = !isDeafened;

            room.remoteParticipants.forEach((p) => {
                p.audioTrackPublications.forEach((pub) => {
                    if (pub.track && 'setEnabled' in pub.track) {
                        (pub.track as any).setEnabled(!newDeafened);
                    }
                });
            });

            set({ isDeafened: newDeafened });
            publishSnapshot();
        },

        toggleCamera: async () => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);
            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                const newState = !get().isCameraOn;
                set({ isCameraOn: newState });
                sendCommand("toggleCamera");
                return;
            }

            const { room, isCameraOn } = get();
            if (!room) return;
            try {
                const newState = !isCameraOn;
                await room.localParticipant.setCameraEnabled(newState);
                set({ isCameraOn: newState });
                get().updateParticipants();
                publishSnapshot();
            } catch (err) {
                set({ error: "Kamera açılamadı." });
                publishSnapshot();
            }
        },

        toggleScreenShare: async () => {
            if (!voiceBusRole) initRuntime(get().runtimeRole);
            if (get().runtimeRole === "follower") {
                if (!ensureOwnerAvailableOrSetError()) return;
                const newState = !get().isScreenSharing;
                set({ isScreenSharing: newState });
                sendCommand("toggleScreenShare");
                return;
            }

            const { room, isScreenSharing } = get();
            if (!room) return;
            try {
                const newState = !isScreenSharing;
                await room.localParticipant.setScreenShareEnabled(newState);
                set({ isScreenSharing: newState });
                get().updateParticipants();
                publishSnapshot();
            } catch (err) {
                if (!(err as Error).message?.includes("Permission denied")) {
                    set({ error: "Ekran paylaşımı başlatılamadı." });
                    publishSnapshot();
                }
            }
        },
    };
});
