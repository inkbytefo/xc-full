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

export interface ParticipantInfo {
    identity: string;
    sid: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isLocal: boolean;
    videoTrack?: Track | null;
}

interface VoiceState {
    // Data
    isConnected: boolean;
    isConnecting: boolean;
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

    // Actions
    connect: (channel: VoiceChannel) => Promise<void>;
    disconnect: () => void;
    toggleMute: () => Promise<void>;
    toggleDeafen: () => void;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    updateParticipants: () => void;
}

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880";

export const useVoiceStore = create<VoiceState>((set, get) => {
    // Helper to extract track from publications
    const getTrack = (publications: Map<string, LocalTrackPublication | RemoteTrackPublication>): Track | null => {
        for (const pub of publications.values()) {
            if (pub.track && pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
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

    return {
        isConnected: false,
        isConnecting: false,
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

        updateParticipants: () => {
            const { room } = get();
            if (!room) return;

            const participants: ParticipantInfo[] = [];

            // Local
            const local = room.localParticipant;
            const localTrack = getTrack(local.trackPublications as unknown as Map<string, LocalTrackPublication>);
            const localInfo: ParticipantInfo = {
                identity: local.identity,
                sid: local.sid,
                isSpeaking: local.isSpeaking,
                isMuted: !local.isMicrophoneEnabled,
                isCameraOn: local.isCameraEnabled,
                isScreenSharing: hasScreenShare(local.trackPublications as unknown as Map<string, LocalTrackPublication>),
                isLocal: true,
                videoTrack: localTrack,
            };
            participants.push(localInfo);

            // Remotes
            room.remoteParticipants.forEach((p: RemoteParticipant) => {
                const track = getTrack(p.trackPublications as unknown as Map<string, RemoteTrackPublication>);
                participants.push({
                    identity: p.identity,
                    sid: p.sid,
                    isSpeaking: p.isSpeaking,
                    isMuted: !p.isMicrophoneEnabled,
                    isCameraOn: p.isCameraEnabled,
                    isScreenSharing: hasScreenShare(p.trackPublications as unknown as Map<string, RemoteTrackPublication>),
                    isLocal: false,
                    videoTrack: track,
                });
            });

            set({
                participants,
                localParticipant: localInfo,
                isCameraOn: local.isCameraEnabled,
                isScreenSharing: hasScreenShare(local.trackPublications as unknown as Map<string, LocalTrackPublication>),
                isMuted: !local.isMicrophoneEnabled,
            });
        },

        connect: async (channel) => {
            const { room: existingRoom, disconnect } = get();

            // If already connecting or connected to SAME channel, do nothing
            if (get().activeChannelId === channel.id && (get().isConnected || get().isConnecting)) {
                return;
            }

            // If connected to different channel, disconnect first
            if (existingRoom) {
                disconnect();
            }

            set({ isConnecting: true, error: null, activeChannelId: channel.id, activeChannel: channel });

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

                // Event Handlers
                const up = () => get().updateParticipants();

                room.on(RoomEvent.Connected, () => {
                    set({ isConnected: true, isConnecting: false });
                    up();
                });

                room.on(RoomEvent.Disconnected, () => {
                    set({
                        isConnected: false,
                        isConnecting: false,
                        isCameraOn: false,
                        isScreenSharing: false,
                        participants: [],
                        localParticipant: null,
                        activeChannelId: null,
                        activeChannel: null,
                        room: null
                    });
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
                    if (state === ConnectionState.Disconnected) {
                        set({ isConnected: false });
                    }
                });

                await room.connect(LIVEKIT_URL, token);
                await room.localParticipant.setMicrophoneEnabled(true);

                set({ room });

            } catch (err) {
                console.error("Global Voice Error:", err);
                set({
                    isConnecting: false,
                    error: err instanceof Error ? err.message : "Connection failed",
                    activeChannelId: null,
                    activeChannel: null
                });
            }
        },

        disconnect: () => {
            const { room } = get();
            if (room) {
                room.disconnect();
            }
            set({
                isConnected: false,
                isConnecting: false,
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
            });
        },

        toggleMute: async () => {
            const { room } = get();
            if (!room) return;
            const newMuted = !get().isMuted;
            await room.localParticipant.setMicrophoneEnabled(!newMuted);
            set({ isMuted: newMuted });
            get().updateParticipants();
        },

        toggleDeafen: () => {
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
        },

        toggleCamera: async () => {
            const { room, isCameraOn } = get();
            if (!room) return;
            try {
                const newState = !isCameraOn;
                await room.localParticipant.setCameraEnabled(newState);
                set({ isCameraOn: newState });
                get().updateParticipants();
            } catch (err) {
                set({ error: "Kamera açılamadı." });
            }
        },

        toggleScreenShare: async () => {
            const { room, isScreenSharing } = get();
            if (!room) return;
            try {
                const newState = !isScreenSharing;
                await room.localParticipant.setScreenShareEnabled(newState);
                set({ isScreenSharing: newState });
                get().updateParticipants();
            } catch (err) {
                if (!(err as Error).message?.includes("Permission denied")) {
                    set({ error: "Ekran paylaşımı başlatılamadı." });
                }
            }
        },
    };
});
