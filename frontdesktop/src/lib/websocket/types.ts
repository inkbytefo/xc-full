// ============================================================================
// WebSocket Types
// ============================================================================

// Event types matching backend
export type EventType =
    // Connection
    | "connected"
    | "disconnected"
    | "error"
    // Subscription
    | "subscribe"
    | "unsubscribe"
    | "subscribed"
    // Presence
    | "user_online"
    | "user_offline"
    | "presence_sync"
    // Typing
    | "typing_start"
    | "typing_stop"
    // DM
    | "dm_message"
    | "dm_message_edited"
    | "dm_message_deleted"
    | "dm_read"
    // Channel
    | "channel_message"
    | "channel_message_edited"
    | "channel_message_deleted"
    // Server
    | "server_join"
    | "server_leave"
    | "member_join"
    | "member_leave"
    // Notification
    | "notification"
    // Call signaling
    | "call_incoming"
    | "call_accepted"
    | "call_rejected"
    | "call_ended"
    | "call_missed"
    // Voice
    | "voice_state_update";

export type SubscriptionType = "user" | "conversation" | "channel" | "server";

export interface Subscription {
    type: SubscriptionType;
    id: string;
}

export interface WebSocketMessage<T = unknown> {
    type: EventType;
    data?: T;
    timestamp: string;
    requestId?: string;
}

// Event data types
export interface TypingEventData {
    conversationId?: string;
    channelId?: string;
    userId: string;
    userHandle?: string;
    userDisplayName?: string;
    isTyping: boolean;
}

export interface ChannelParticipant {
    userId: string;
    handle: string;
    displayName: string;
    avatar?: string;
    isMuted?: boolean;
    isDeafened?: boolean;
    isSpeaking?: boolean;
    isScreening?: boolean;
    isVideoOn?: boolean;
}

export interface VoiceStateUpdateEventData {
    serverId: string;
    channelId: string;
    userId: string;
    userHandle: string;
    userDisplayName: string;
    userAvatar: string;
    action: "joined" | "left";
}

export interface PresenceEventData {
    userId: string;
    isOnline: boolean;
}

export interface DMMessageEventData {
    conversationId: string;
    message: Record<string, unknown>;
}

export interface ChannelMessageEventData {
    channelId: string;
    serverId: string;
    message: Record<string, unknown>;
}

export interface ConnectedEventData {
    clientId: string;
    userId: string;
}

export interface CallEventData {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    calleeId: string;
    calleeName?: string;
    callType: "voice" | "video";
    roomName?: string;
}
