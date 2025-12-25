// ============================================================================
// useDmMessages - DM Messages with React Query
// ============================================================================
// Handles message fetching, mutations (send/edit/delete), and typing indicator.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "../../../api/types";
import {
    useMessages,
    useSendMessage,
    useEditMessage,
    useDeleteMessage,
    useRealtimeSync,
} from "../../../lib/query";
import { useTypingIndicator, useTypingUsers } from "../../../lib/websocket/hooks";
import { markAsRead } from "../dmApi";

interface UseDmMessagesOptions {
    conversationId: string | null;
    onError?: (message: string) => void;
}

interface UseDmMessagesReturn {
    messages: Message[];
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
    stopTypingNow: () => void;
    typingUsers: string[];
}

export function useDmMessages({
    conversationId,
    onError,
}: UseDmMessagesOptions): UseDmMessagesReturn {
    const [messageText, setMessageText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // React Query: Real-time sync
    useRealtimeSync();

    // React Query: Fetch messages
    const {
        data: messagesData,
        isLoading: messagesLoading,
        error: fetchError,
    } = useMessages(conversationId);

    // React Query: Mutations
    const sendMessageMutation = useSendMessage(conversationId);
    const editMessageMutation = useEditMessage(conversationId);
    const deleteMessageMutation = useDeleteMessage(conversationId);

    // Typing indicator
    const { handleTyping, stopTypingNow } = useTypingIndicator(conversationId || undefined);
    const typingUsers = useTypingUsers(conversationId);

    // Flatten messages
    const messages = useMemo(() => {
        if (!messagesData?.pages) return [];
        const allMessages = messagesData.pages.flatMap((page) => page.data);
        return [...allMessages].reverse();
    }, [messagesData]);

    // Mark as read
    useEffect(() => {
        if (conversationId) {
            markAsRead(conversationId).catch(() => { });
        }
    }, [conversationId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle errors
    useEffect(() => {
        if (fetchError && onError) {
            onError(fetchError instanceof Error ? fetchError.message : "Mesajlar yüklenemedi");
        }
    }, [fetchError, onError]);

    useEffect(() => {
        const error = sendMessageMutation.error || editMessageMutation.error || deleteMessageMutation.error;
        if (error && onError) {
            onError(error instanceof Error ? error.message : "İşlem başarısız");
        }
    }, [sendMessageMutation.error, editMessageMutation.error, deleteMessageMutation.error, onError]);

    // Send message
    const handleSend = useCallback(async () => {
        if (!messageText.trim() || !conversationId || sendMessageMutation.isPending) return;

        stopTypingNow?.();
        try {
            await sendMessageMutation.mutateAsync(messageText.trim());
            setMessageText("");
        } catch {
            // Error handled by useEffect
        }
    }, [messageText, conversationId, sendMessageMutation, stopTypingNow]);

    // Edit message
    const handleEdit = useCallback(async (messageId: string, content: string) => {
        if (!conversationId) return;
        await editMessageMutation.mutateAsync({ messageId, content });
    }, [conversationId, editMessageMutation]);

    // Delete message
    const handleDelete = useCallback(async (messageId: string) => {
        if (!conversationId) return;
        await deleteMessageMutation.mutateAsync(messageId);
    }, [conversationId, deleteMessageMutation]);

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
        stopTypingNow: stopTypingNow || (() => { }),
        typingUsers,
    };
}
