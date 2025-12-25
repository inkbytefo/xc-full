// ============================================================================
// Real-time Sync Hook
// ============================================================================
// Bridges WebSocket events to React Query cache updates.
// This hook should be used at the app root level.

import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketEvent } from '../websocket/hooks';
import type { DMMessageEventData, ChannelMessageEventData } from '../websocket/types';

/**
 * Syncs WebSocket events with React Query cache.
 * 
 * Events handled:
 * - dm_message: Invalidates messages and conversations cache
 * - dm_message_edited: Updates specific message in cache
 * - dm_message_deleted: Removes message from cache
 * - channel_message: Invalidates channel messages cache
 * - notification: Invalidates notifications cache
 */
export function useRealtimeSync() {
    const queryClient = useQueryClient();

    // DM: New message received
    useWebSocketEvent<DMMessageEventData>('dm_message', (data) => {
        // Invalidate messages for this conversation to fetch latest
        queryClient.invalidateQueries({
            queryKey: ['messages', data.conversationId],
        });
        // Also invalidate conversations list (for unread count, last message preview)
        queryClient.invalidateQueries({
            queryKey: ['conversations'],
        });
    }, [queryClient]);

    // DM: Message edited
    useWebSocketEvent<DMMessageEventData>('dm_message_edited', (data) => {
        // Direct cache update for edited message
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
        // Remove message from cache
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

    // Channel: New message received
    useWebSocketEvent<ChannelMessageEventData>('channel_message', (data) => {
        queryClient.invalidateQueries({
            queryKey: ['channel-messages', data.channelId],
        });
    }, [queryClient]);

    // Notification received
    useWebSocketEvent('notification', () => {
        queryClient.invalidateQueries({
            queryKey: ['notifications'],
        });
    }, [queryClient]);
}

// ============================================================================
// Cache Helpers
// ============================================================================

interface InfiniteQueryData {
    pages: Array<{ messages: Array<Record<string, unknown>> }>;
    pageParams: unknown[];
}

/**
 * Updates a message in the infinite query cache.
 */
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

/**
 * Removes a message from the infinite query cache.
 */
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
