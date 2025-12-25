// ============================================================================
// useChannelMessages Hook - Server Channel Messages with React Query
// ============================================================================
// Provides hooks for fetching, sending, editing, and deleting channel messages.
// Includes optimistic updates for instant UI feedback.

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchChannelMessages,
    sendChannelMessage,
    editChannelMessage,
    deleteChannelMessage,
    ackChannelMessage,
} from '../../../features/servers/serversApi';
import type { ChannelMessage, ListResponse } from '../../../api/types';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '../../../api/types';

// ============================================================================
// Query Keys
// ============================================================================

export const channelMessageKeys = {
    all: ['channel-messages'] as const,
    channel: (channelId: string) => ['channel-messages', channelId] as const,
};

// ============================================================================
// useChannelMessages - Infinite Query for Channel Messages
// ============================================================================

interface UseChannelMessagesOptions {
    enabled?: boolean;
}

export function useChannelMessages(
    serverId: string | null,
    channelId: string | null,
    options?: UseChannelMessagesOptions
) {
    return useInfiniteQuery({
        queryKey: channelId ? channelMessageKeys.channel(channelId) : ['channel-messages', 'none'],
        queryFn: async ({ pageParam }) => {
            if (!serverId || !channelId) {
                return { data: [], nextCursor: undefined };
            }
            return fetchChannelMessages(serverId, channelId, {
                cursor: pageParam as string | undefined,
                limit: 50,
            });
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
        enabled: options?.enabled !== false && !!serverId && !!channelId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// ============================================================================
// useSendChannelMessage - Send Message Mutation with Optimistic Update
// ============================================================================

export function useSendChannelMessage(serverId: string | null, channelId: string | null) {
    const queryClient = useQueryClient();
    const user = useAuthStore((s: { user: User | null }) => s.user);

    return useMutation({
        mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string }) => {
            if (!serverId || !channelId) throw new Error('No channel selected');
            return sendChannelMessage(serverId, channelId, content, replyToId);
        },

        // Optimistic update
        onMutate: async ({ content }) => {
            if (!channelId || !user) return;

            await queryClient.cancelQueries({
                queryKey: channelMessageKeys.channel(channelId)
            });

            const previousMessages = queryClient.getQueryData(
                channelMessageKeys.channel(channelId)
            );

            // Create optimistic message
            const optimisticMessage: ChannelMessage = {
                id: `optimistic-${Date.now()}`,
                channelId,
                serverId: serverId || '',
                authorId: user.id,
                content,
                createdAt: new Date().toISOString(),
                author: {
                    id: user.id,
                    handle: user.handle,
                    displayName: user.displayName ?? user.handle,
                    avatarGradient: user.avatarGradient,
                },
            };

            // Add to cache
            queryClient.setQueryData(
                channelMessageKeys.channel(channelId),
                (old: unknown) => {
                    const data = old as { pages: Array<ListResponse<ChannelMessage>>; pageParams: unknown[] } | undefined;
                    if (!data?.pages) return old;

                    return {
                        ...data,
                        pages: data.pages.map((page, index) =>
                            index === 0
                                ? { ...page, data: [optimisticMessage, ...page.data] }
                                : page
                        ),
                    };
                }
            );

            return { previousMessages };
        },

        // Rollback on error
        onError: (_err, _variables, context) => {
            if (context?.previousMessages && channelId) {
                queryClient.setQueryData(
                    channelMessageKeys.channel(channelId),
                    context.previousMessages
                );
            }
        },

        // Refetch after mutation
        onSettled: () => {
            if (channelId) {
                queryClient.invalidateQueries({
                    queryKey: channelMessageKeys.channel(channelId)
                });
            }
        },
    });
}

// ============================================================================
// useEditChannelMessage - Edit Message Mutation with Optimistic Update
// ============================================================================

interface EditChannelMessageParams {
    messageId: string;
    content: string;
}

export function useEditChannelMessage(serverId: string | null, channelId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ messageId, content }: EditChannelMessageParams) => {
            if (!serverId || !channelId) throw new Error('No channel selected');
            return editChannelMessage(serverId, channelId, messageId, content);
        },

        onMutate: async ({ messageId, content }) => {
            if (!channelId) return;

            await queryClient.cancelQueries({
                queryKey: channelMessageKeys.channel(channelId)
            });

            const previousMessages = queryClient.getQueryData(
                channelMessageKeys.channel(channelId)
            );

            // Optimistically update the message
            queryClient.setQueryData(
                channelMessageKeys.channel(channelId),
                (old: unknown) => {
                    const data = old as { pages: Array<ListResponse<ChannelMessage>>; pageParams: unknown[] } | undefined;
                    if (!data?.pages) return old;

                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: page.data.map((msg: ChannelMessage) =>
                                msg.id === messageId
                                    ? { ...msg, content, isEdited: true }
                                    : msg
                            ),
                        })),
                    };
                }
            );

            return { previousMessages };
        },

        onError: (_err, _variables, context) => {
            if (context?.previousMessages && channelId) {
                queryClient.setQueryData(
                    channelMessageKeys.channel(channelId),
                    context.previousMessages
                );
            }
        },
    });
}

// ============================================================================
// useDeleteChannelMessage - Delete Message Mutation with Optimistic Update
// ============================================================================

export function useDeleteChannelMessage(serverId: string | null, channelId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (messageId: string) => {
            if (!serverId || !channelId) throw new Error('No channel selected');
            return deleteChannelMessage(serverId, channelId, messageId);
        },

        onMutate: async (messageId) => {
            if (!channelId) return;

            await queryClient.cancelQueries({
                queryKey: channelMessageKeys.channel(channelId)
            });

            const previousMessages = queryClient.getQueryData(
                channelMessageKeys.channel(channelId)
            );

            // Optimistically remove the message
            queryClient.setQueryData(
                channelMessageKeys.channel(channelId),
                (old: unknown) => {
                    const data = old as { pages: Array<ListResponse<ChannelMessage>>; pageParams: unknown[] } | undefined;
                    if (!data?.pages) return old;

                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: page.data.filter((msg: ChannelMessage) => msg.id !== messageId),
                        })),
                    };
                }
            );

            return { previousMessages };
        },

        onError: (_err, _messageId, context) => {
            if (context?.previousMessages && channelId) {
                queryClient.setQueryData(
                    channelMessageKeys.channel(channelId),
                    context.previousMessages
                );
            }
        },
    });
}

// ============================================================================
// useAckChannelMessage - Mark message as read
// ============================================================================

export function useAckChannelMessage(serverId: string | null, channelId: string | null) {
    return useMutation({
        mutationFn: async (messageId: string) => {
            if (!serverId || !channelId) throw new Error('No channel selected');
            return ackChannelMessage(serverId, channelId, messageId);
        },
    });
}
