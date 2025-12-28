// ============================================================================
// Notification Toasts Hook
// ============================================================================
// Bridges WebSocket events to toast notifications.
// This hook should be used at the app root level within ToastProvider.

import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketEvent } from '../websocket/hooks';
import { useToast } from '../../features/overlay/NotificationToast';
import { useAuthStore } from '../../store/authStore';
import { useMediaSessionStore } from '../../store/mediaSessionStore';
import { playSound, stopLoopingSound } from '../soundService';
import type { DMMessageEventData, ChannelMessageEventData, CallEventData } from '../websocket/types';

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
            playSound('message_dm');
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
            playSound('message_channel');
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

        playSound('notification');
        addToast({
            type: data.type === 'system' ? 'warning' : 'info',
            title,
            message,
            duration: 5000,
        });
    }, [queryClient, addToast]);

    // ========================================================================
    // Call Signaling Events - Using mediaSessionStore
    // ========================================================================

    // Call: Incoming call
    useWebSocketEvent<CallEventData>('call_incoming', (data) => {
        // Use the new mediaSessionStore to handle incoming call
        useMediaSessionStore.getState().receiveIncomingCall({
            id: data.callId || crypto.randomUUID(),
            type: (data.callType as 'voice' | 'video') || 'voice',
            from: {
                userId: data.callerId,
                displayName: data.callerName || 'Unknown',
                handle: data.callerName ? `@${data.callerName.toLowerCase().replace(/\s/g, '')}` : 'unknown',
                avatarGradient: ['#667eea', '#764ba2'], // Default gradient
            },
            conversationId: data.callId || '', // Use callId as fallback
        });
    }, []);

    // Call: Accepted
    useWebSocketEvent<CallEventData>('call_accepted', () => {
        stopLoopingSound();
        playSound('call_connect');
        // Accept is handled by the callee, this is for the caller to know
        // The mediaSessionStore will manage the actual connection
    }, []);

    // Call: Rejected
    useWebSocketEvent<CallEventData>('call_rejected', (data) => {
        stopLoopingSound();
        playSound('call_rejected');
        // End the session if we have one
        useMediaSessionStore.getState().endSession();
        addToast({
            type: 'info',
            title: '📵 Arama Reddedildi',
            message: `${data.calleeName || 'Kullanıcı'} aramayı reddetti`,
            duration: 4000,
        });
    }, [addToast]);

    // Call: Ended
    useWebSocketEvent<CallEventData>('call_ended', () => {
        stopLoopingSound();
        playSound('call_end');
        useMediaSessionStore.getState().endSession();
    }, []);

    // Call: Missed
    useWebSocketEvent<CallEventData>('call_missed', (data) => {
        // Clean up any incoming calls
        useMediaSessionStore.getState().cleanupExpiredCalls();

        // Show missed call toast to callee
        if (data.calleeId === currentUserId) {
            addToast({
                type: 'warning',
                title: '📵 Cevapsız Arama',
                message: `${data.callerName} sizi aradı`,
                duration: 6000,
            });
        } else {
            // Show "no answer" to caller
            addToast({
                type: 'info',
                title: '📵 Cevap Yok',
                message: `${data.calleeName || 'Kullanıcı'} aramayı cevaplayamadı`,
                duration: 4000,
            });
        }
    }, [addToast, currentUserId]);
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
