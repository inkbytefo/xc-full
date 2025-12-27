// ============================================================================
// useChannelMessages - React Query Based Channel Messages Hook
// ============================================================================
// This is a facade that uses the global React Query hooks for channel messages.
// It maintains backward compatibility with the existing component interface.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChannelMessage } from "../../../api/types";
import {
    useChannelMessages as useChannelMessagesQuery,
    useSendChannelMessage,
    useEditChannelMessage,
    useDeleteChannelMessage,
    useRealtimeSync,
} from "../../../lib/query";
import { useWebSocketStore } from "../../../lib/websocket/store";
import { useTypingIndicator, useTypingUsers } from "../../../lib/websocket/hooks";

interface UseChannelMessagesOptions {
    serverId: string | null;
    channelId: string | null;
    onError?: (message: string) => void;
}

interface UseChannelMessagesReturn {
    messages: ChannelMessage[];
    messagesLoading: boolean;
    sending: boolean;
    messageText: string;
    setMessageText: (text: string) => void;
    handleSend: () => Promise<void>;
    handleEdit: (messageId: string, content: string) => Promise<void>;
    handleDelete: (messageId: string) => Promise<void>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    // Typing
    handleTyping: () => void;
    typingUsers: { userId: string; handle?: string; displayName?: string }[];
}

export function useChannelMessages({
    serverId,
    channelId,
    onError,
}: UseChannelMessagesOptions): UseChannelMessagesReturn {
    const [messageText, setMessageText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // React Query: Real-time sync (WebSocket → Cache)
    useRealtimeSync();

    // React Query: Fetch messages
    const {
        data: messagesData,
        isLoading: messagesLoading,
        error: fetchError,
    } = useChannelMessagesQuery(serverId, channelId);

    // React Query: Mutations
    const sendMessageMutation = useSendChannelMessage(serverId, channelId);
    const editMessageMutation = useEditChannelMessage(serverId, channelId);
    const deleteMessageMutation = useDeleteChannelMessage(serverId, channelId);

    // Typing indicator
    const { handleTyping, stopTypingNow } = useTypingIndicator(undefined, channelId || undefined);
    const typingUsers = useTypingUsers(channelId);

    // Flatten messages from infinite query pages and reverse for display
    const messages = useMemo(() => {
        if (!messagesData?.pages) return [];
        const allMessages = messagesData.pages.flatMap((page) => page.data);
        return [...allMessages].reverse();
    }, [messagesData]);

    // WebSocket: Subscribe to channel for real-time updates
    useEffect(() => {
        if (!channelId) return;

        const store = useWebSocketStore.getState();
        store.subscribeToChannel(channelId);

        return () => {
            store.unsubscribeFromChannel(channelId);
        };
    }, [channelId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle fetch error
    useEffect(() => {
        if (fetchError && onError) {
            onError(fetchError instanceof Error ? fetchError.message : "Mesajlar yüklenemedi");
        }
    }, [fetchError, onError]);

    // Handle mutation errors
    useEffect(() => {
        const error = sendMessageMutation.error || editMessageMutation.error || deleteMessageMutation.error;
        if (error && onError) {
            onError(error instanceof Error ? error.message : "İşlem başarısız");
        }
    }, [sendMessageMutation.error, editMessageMutation.error, deleteMessageMutation.error, onError]);

    // Send message handler
    const handleSend = useCallback(async () => {
        if (!messageText.trim() || !serverId || !channelId) return;

        stopTypingNow?.();
        try {
            await sendMessageMutation.mutateAsync({ content: messageText.trim() });
            setMessageText("");
        } catch {
            // Error is handled by the useEffect above
        }
    }, [messageText, serverId, channelId, sendMessageMutation, stopTypingNow]);

    // Edit message handler
    const handleEdit = useCallback(async (messageId: string, content: string) => {
        if (!serverId || !channelId) return;

        await editMessageMutation.mutateAsync({ messageId, content });
    }, [serverId, channelId, editMessageMutation]);

    // Delete message handler
    const handleDelete = useCallback(async (messageId: string) => {
        if (!serverId || !channelId) return;

        await deleteMessageMutation.mutateAsync(messageId);
    }, [serverId, channelId, deleteMessageMutation]);

    return {
        messages,
        messagesLoading,
        sending: sendMessageMutation.isPending,
        messageText,
        setMessageText,
        handleSend,
        handleEdit,
        handleDelete,
        messagesEndRef: messagesEndRef as React.RefObject<HTMLDivElement>,
        handleTyping,
        typingUsers,
    };
}
