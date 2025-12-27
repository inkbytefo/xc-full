// ============================================================================
// WebSocket React Hooks
// ============================================================================

import { useEffect, useCallback, useRef } from "react";
import { useWebSocketStore, subscribeToEvent } from "./store";
import type { EventType, DMMessageEventData, ChannelMessageEventData } from "./types";

// Hook to use WebSocket connection status
export function useWebSocketStatus() {
    return useWebSocketStore((state) => state.status);
}

// Hook to check if connected
export function useIsWebSocketConnected() {
    return useWebSocketStore((state) => state.status === "connected");
}

// Hook to subscribe to a conversation
export function useConversationSubscription(conversationId: string | null) {
    const subscribe = useWebSocketStore((state) => state.subscribeToConversation);
    const unsubscribe = useWebSocketStore((state) => state.unsubscribeFromConversation);

    useEffect(() => {
        if (!conversationId) return;

        subscribe(conversationId);
        return () => unsubscribe(conversationId);
    }, [conversationId, subscribe, unsubscribe]);
}

// Hook to subscribe to a channel
export function useChannelSubscription(channelId: string | null) {
    const subscribe = useWebSocketStore((state) => state.subscribeToChannel);
    const unsubscribe = useWebSocketStore((state) => state.unsubscribeFromChannel);

    useEffect(() => {
        if (!channelId) return;

        subscribe(channelId);
        return () => unsubscribe(channelId);
    }, [channelId, subscribe, unsubscribe]);
}

// Hook to get typing users for a conversation/channel
export function useTypingUsers(targetId: string | null): { userId: string; handle?: string; displayName?: string }[] {
    const typingUsers = useWebSocketStore((state) => state.typingUsers);

    if (!targetId) return [];

    const users = typingUsers.get(targetId);
    return users ? Array.from(users.values()) : [];
}

// Hook to send typing indicators
export function useTypingIndicator(conversationId?: string, channelId?: string) {
    const startTyping = useWebSocketStore((state) => state.startTyping);
    const stopTyping = useWebSocketStore((state) => state.stopTyping);
    const typingTimeoutRef = useRef<number | null>(null);
    const isTypingRef = useRef(false);

    const handleTyping = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            startTyping(conversationId, channelId);
        }

        // Reset timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = window.setTimeout(() => {
            isTypingRef.current = false;
            stopTyping(conversationId, channelId);
        }, 3000);
    }, [conversationId, channelId, startTyping, stopTyping]);

    const stopTypingNow = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        if (isTypingRef.current) {
            isTypingRef.current = false;
            stopTyping(conversationId, channelId);
        }
    }, [conversationId, channelId, stopTyping]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (isTypingRef.current) {
                stopTyping(conversationId, channelId);
            }
        };
    }, [conversationId, channelId, stopTyping]);

    return { handleTyping, stopTypingNow };
}

// Hook to listen for DM messages
export function useDMMessageListener(
    callback: (data: DMMessageEventData) => void,
    deps: unknown[] = []
) {
    useEffect(() => {
        const unsubscribe = subscribeToEvent("dm_message", callback as (data: unknown) => void);
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

// Hook to listen for channel messages
export function useChannelMessageListener(
    callback: (data: ChannelMessageEventData) => void,
    deps: unknown[] = []
) {
    useEffect(() => {
        const unsubscribe = subscribeToEvent("channel_message", callback as (data: unknown) => void);
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

// Generic event listener hook
export function useWebSocketEvent<T = unknown>(
    eventType: EventType,
    callback: (data: T) => void,
    deps: unknown[] = []
) {
    useEffect(() => {
        const unsubscribe = subscribeToEvent(eventType, callback as (data: unknown) => void);
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventType, ...deps]);
}

// Hook to check if a user is online
export function useIsUserOnline(userId: string): boolean {
    const onlineUsers = useWebSocketStore((state) => state.onlineUsers);
    return onlineUsers.has(userId);
}
