import { create } from "zustand";
import { WebSocketClient, type WebSocketStatus } from "./client";
import type { EventType, WebSocketMessage, TypingEventData, PresenceEventData, VoiceStateUpdateEventData, ChannelParticipant } from "./types";

interface WebSocketState {
    client: WebSocketClient | null;
    status: WebSocketStatus;
    typingUsers: Map<string, Map<string, { userId: string, handle?: string, displayName?: string }>>; // conversationId/channelId -> Map<userId, UserInfo>
    onlineUsers: Set<string>;
    channelParticipants: Map<string, Map<string, ChannelParticipant>>; // channelId -> Map<userId, Participant>

    // Actions
    connect: (url: string) => void;
    disconnect: () => void;
    subscribeToConversation: (conversationId: string) => void;
    unsubscribeFromConversation: (conversationId: string) => void;
    subscribeToChannel: (channelId: string) => void;
    unsubscribeFromChannel: (channelId: string) => void;
    subscribeToServer: (serverId: string) => void;
    unsubscribeFromServer: (serverId: string) => void;
    startTyping: (conversationId?: string, channelId?: string) => void;
    stopTyping: (conversationId?: string, channelId?: string) => void;
    setAllParticipants: (participants: any[]) => void;
}

// Event listeners stored outside store
const eventListeners: Map<EventType, Set<(data: unknown) => void>> = new Map();

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
    client: null,
    status: "disconnected",
    typingUsers: new Map(),
    onlineUsers: new Set(),
    channelParticipants: new Map(),

    connect: (url: string) => {
        const existing = get().client;
        if (existing) {
            existing.disconnect();
        }

        const client = new WebSocketClient({
            url,
            // token removed - using cookies
            onStatusChange: (status) => set({ status }),
            onMessage: (message) => handleMessage(message, get, set),
        });

        client.connect();
        set({ client });
    },

    disconnect: () => {
        const client = get().client;
        if (client) {
            client.disconnect();
        }
        set({
            client: null,
            status: "disconnected",
            typingUsers: new Map(),
            channelParticipants: new Map(),
        });
    },

    subscribeToConversation: (conversationId: string) => {
        const client = get().client;
        if (client) {
            client.subscribe([{ type: "conversation", id: conversationId }]);
        }
    },

    unsubscribeFromConversation: (conversationId: string) => {
        const client = get().client;
        if (client) {
            client.unsubscribe([{ type: "conversation", id: conversationId }]);
        }
        // Clear typing users for this conversation
        const newTyping = new Map(get().typingUsers);
        newTyping.delete(conversationId);
        set({ typingUsers: newTyping });
    },

    subscribeToChannel: (channelId: string) => {
        const client = get().client;
        if (client) {
            client.subscribe([{ type: "channel", id: channelId }]);
        }
    },

    unsubscribeFromChannel: (channelId: string) => {
        const client = get().client;
        if (client) {
            client.unsubscribe([{ type: "channel", id: channelId }]);
        }
        const newTyping = new Map(get().typingUsers);
        newTyping.delete(channelId);
        set({ typingUsers: newTyping });
    },

    subscribeToServer: (serverId: string) => {
        const client = get().client;
        if (client) {
            client.subscribe([{ type: "server", id: serverId }]);
        }
    },

    unsubscribeFromServer: (serverId: string) => {
        const client = get().client;
        if (client) {
            client.unsubscribe([{ type: "server", id: serverId }]);
        }
    },

    startTyping: (conversationId?: string, channelId?: string) => {
        const client = get().client;
        if (client) {
            client.startTyping(conversationId, channelId);
        }
    },

    stopTyping: (conversationId?: string, channelId?: string) => {
        const client = get().client;
        if (client) {
            client.stopTyping(conversationId, channelId);
        }
    },

    setAllParticipants: (participants: any[]) => {
        const newMap = new Map<string, Map<string, ChannelParticipant>>();

        participants.forEach(p => {
            if (!newMap.has(p.channelId)) {
                newMap.set(p.channelId, new Map());
            }
            newMap.get(p.channelId)!.set(p.userId, {
                userId: p.userId,
                handle: p.handle,
                displayName: p.displayName,
                avatar: p.avatar,
                isMuted: p.isMuted,
                isDeafened: p.isDeafened,
                isSpeaking: false, // Default
                isVideoOn: p.isVideoOn,
                isScreening: p.isScreening
            });
        });

        set({ channelParticipants: newMap });
    }
}));

// Message handler
function handleMessage(
    message: WebSocketMessage,
    get: () => WebSocketState,
    set: (partial: Partial<WebSocketState>) => void
) {
    const { type, data } = message;

    switch (type) {
        case "typing_start":
        case "typing_stop": {
            const typingData = data as TypingEventData;
            const key = typingData.conversationId || typingData.channelId || "";

            const newTyping = new Map(get().typingUsers);
            const users = new Map(newTyping.get(key) || []);

            if (type === "typing_start") {
                users.set(typingData.userId, {
                    userId: typingData.userId,
                    handle: typingData.userHandle,
                    displayName: typingData.userDisplayName
                });
            } else {
                users.delete(typingData.userId);
            }

            if (users.size > 0) {
                newTyping.set(key, users);
            } else {
                newTyping.delete(key);
            }

            set({ typingUsers: newTyping });
            break;
        }

        case "user_online": {
            const presenceData = data as PresenceEventData;
            const newOnline = new Set(get().onlineUsers);
            newOnline.add(presenceData.userId);
            set({ onlineUsers: newOnline });
            break;
        }

        case "user_offline": {
            const presenceData = data as PresenceEventData;
            const newOnline = new Set(get().onlineUsers);
            newOnline.delete(presenceData.userId);
            set({ onlineUsers: newOnline });
            break;
        }

        case "voice_state_update": {
            const voiceData = data as VoiceStateUpdateEventData;
            const channelId = voiceData.channelId;
            const userId = voiceData.userId;

            const newParticipants = new Map(get().channelParticipants);
            const channelUsers = new Map(newParticipants.get(channelId) || []);

            if (voiceData.action === "joined") {
                channelUsers.set(userId, {
                    userId: userId,
                    handle: voiceData.userHandle,
                    displayName: voiceData.userDisplayName,
                    avatar: voiceData.userAvatar,
                    isMuted: false, // defaults
                    isDeafened: false,
                    isSpeaking: false,
                    isVideoOn: false,
                    isScreening: false
                });
            } else {
                channelUsers.delete(userId);
            }

            if (channelUsers.size > 0) {
                newParticipants.set(channelId, channelUsers);
            } else {
                newParticipants.delete(channelId);
            }

            set({ channelParticipants: newParticipants });
            break;
        }

        default:
            break;
    }

    // Notify event listeners
    const listeners = eventListeners.get(type);
    if (listeners) {
        listeners.forEach((listener) => {
            try {
                listener(data);
            } catch (e) {
                console.error("Event listener error:", e);
            }
        });
    }
}

// Event subscription helper
export function subscribeToEvent(
    eventType: EventType,
    callback: (data: unknown) => void
): () => void {
    if (!eventListeners.has(eventType)) {
        eventListeners.set(eventType, new Set());
    }
    eventListeners.get(eventType)!.add(callback);

    return () => {
        const listeners = eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(callback);
        }
    };
}
