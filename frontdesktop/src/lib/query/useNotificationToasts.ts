// ============================================================================
// Notification Toasts Hook
// ============================================================================
// Bridges WebSocket events to toast notifications.
// This hook should be used at the app root level within ToastProvider.

import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketEvent } from '../websocket/hooks';
import { useToast } from '../../features/overlay/NotificationToast';
import { useAuthStore } from '../../store/authStore';
import type { DMMessageEventData, ChannelMessageEventData } from '../websocket/types';

interface NotificationEventData {
    id: string;
    type: 'follow' | 'dm' | 'mention' | 'like' | 'reply' | 'server_invite' | 'server_join' | 'stream_live' | 'system';
    title: string;
    message?: string;
    actorName?: string;
    actorAvatar?: string;
}

/**
 * Hook that shows toast notifications for real-time events.
 * Also syncs with React Query cache.
 */
export function useNotificationToasts() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const currentUserId = useAuthStore((s) => s.user?.id);

    // DM: New message received - show toast if not from current user
    useWebSocketEvent<DMMessageEventData>('dm_message', (data) => {
        // Invalidate cache
        queryClient.invalidateQueries({
            queryKey: ['messages', data.conversationId],
        });
        queryClient.invalidateQueries({
            queryKey: ['conversations'],
        });

        // Show toast if message is from someone else
        const message = data.message;
        const senderId = message?.senderId || message?.sender_id;
        const senderName = String(message?.senderName || message?.sender_name || 'Someone');
        const content = String(message?.content || '');

        if (senderId && senderId !== currentUserId) {
            addToast({
                type: 'info',
                title: senderName,
                message: content.length > 50 ? content.substring(0, 50) + '...' : content,
                duration: 5000,
            });
        }
    }, [queryClient, addToast, currentUserId]);

    // DM: Message edited
    useWebSocketEvent<DMMessageEventData>('dm_message_edited', (data) => {
        queryClient.setQueryData(
            ['messages', data.conversationId],
            (old: unknown) => {
                if (!old || typeof old !== 'object') return old;
                return updateMessageInCache(old, data.message);
            }
        );
    }, [queryClient]);

    // DM: Message deleted
    useWebSocketEvent<DMMessageEventData>('dm_message_deleted', (data) => {
        queryClient.setQueryData(
            ['messages', data.conversationId],
            (old: unknown) => {
                if (!old || typeof old !== 'object') return old;
                const messageId = (data.message as Record<string, unknown>)?.id;
                if (typeof messageId === 'string') {
                    return removeMessageFromCache(old, messageId);
                }
                return old;
            }
        );
    }, [queryClient]);

    // Channel: New message received - show toast
    useWebSocketEvent<ChannelMessageEventData>('channel_message', (data) => {
        queryClient.invalidateQueries({
            queryKey: ['channel-messages', data.channelId],
        });

        // Show toast
        const message = data.message;
        const senderId = message?.senderId || message?.sender_id;
        const senderName = String(message?.senderName || message?.sender_name || 'Someone');
        const content = String(message?.content || '');

        if (senderId && senderId !== currentUserId) {
            addToast({
                type: 'info',
                title: senderName,
                message: content.length > 50 ? content.substring(0, 50) + '...' : content,
                duration: 4000,
            });
        }
    }, [queryClient, addToast, currentUserId]);

    // General notification
    useWebSocketEvent<NotificationEventData>('notification', (data) => {
        queryClient.invalidateQueries({
            queryKey: ['notifications'],
        });

        // Show toast based on notification type
        const typeToTitle: Record<string, string> = {
            follow: '🎉 New follower!',
            mention: '💬 You were mentioned',
            like: '❤️ Someone liked your post',
            reply: '💬 New reply',
            server_invite: '📨 Server invitation',
            stream_live: '🔴 Stream started',
            system: '📢 System notification',
        };

        const title = data.title || typeToTitle[data.type] || 'Notification';
        const message = data.message || data.actorName || '';

        addToast({
            type: data.type === 'system' ? 'warning' : 'info',
            title,
            message,
            duration: 5000,
        });
    }, [queryClient, addToast]);
}

// ============================================================================
// Cache Helpers
// ============================================================================

interface InfiniteQueryData {
    pages: Array<{ messages: Array<Record<string, unknown>> }>;
    pageParams: unknown[];
}

function updateMessageInCache(
    data: unknown,
    updatedMessage: Record<string, unknown>
): unknown {
    const queryData = data as InfiniteQueryData;
    if (!queryData?.pages) return data;

    return {
        ...queryData,
        pages: queryData.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
                msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
            ),
        })),
    };
}

function removeMessageFromCache(data: unknown, messageId: string): unknown {
    const queryData = data as InfiniteQueryData;
    if (!queryData?.pages) return data;

    return {
        ...queryData,
        pages: queryData.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((msg) => msg.id !== messageId),
        })),
    };
}
