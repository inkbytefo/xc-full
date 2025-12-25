// ============================================================================
// useMessages Hook - DM Message Operations with React Query
// ============================================================================
// Provides hooks for fetching, sending, editing, and deleting DM messages.
// Includes optimistic updates for instant UI feedback.

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMessages, sendMessage, editMessage, deleteMessage } from '../../../features/dm/dmApi';
import type { Message, ListResponse } from '../../../api/types';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '../../../api/types';

// ============================================================================
// Query Keys
// ============================================================================

export const messageKeys = {
    all: ['messages'] as const,
    conversation: (conversationId: string) => ['messages', conversationId] as const,
};

// ============================================================================
// useMessages - Infinite Query for Messages
// ============================================================================

interface UseMessagesOptions {
    enabled?: boolean;
}

export function useMessages(conversationId: string | null, options?: UseMessagesOptions) {
    return useInfiniteQuery({
        queryKey: conversationId ? messageKeys.conversation(conversationId) : ['messages', 'none'],
        queryFn: async ({ pageParam }) => {
            if (!conversationId) {
                return { data: [], nextCursor: undefined };
            }
            return fetchMessages(conversationId, {
                cursor: pageParam as string | undefined,
                limit: 50,
            });
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
        enabled: options?.enabled !== false && !!conversationId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// ============================================================================
// useSendMessage - Send Message Mutation with Optimistic Update
// ============================================================================

export function useSendMessage(conversationId: string | null) {
    const queryClient = useQueryClient();
    const user = useAuthStore((s: { user: User | null }) => s.user);

    return useMutation({
        mutationFn: async (content: string) => {
            if (!conversationId) throw new Error('No conversation selected');
            return sendMessage(conversationId, content);
        },

        // Optimistic update - add message immediately
        onMutate: async (content) => {
            if (!conversationId || !user) return;

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: messageKeys.conversation(conversationId)
            });

            // Snapshot previous value
            const previousMessages = queryClient.getQueryData(
                messageKeys.conversation(conversationId)
            );

            // Create optimistic message
            const optimisticMessage: Message = {
                id: `optimistic-${Date.now()}`,
                conversationId: conversationId,
                senderId: user.id,
                content,
                createdAt: new Date().toISOString(),
                sender: {
                    id: user.id,
                    handle: user.handle,
                    displayName: user.displayName ?? user.handle,
                    avatarGradient: user.avatarGradient,
                },
            };

            // Add to cache
            queryClient.setQueryData(
                messageKeys.conversation(conversationId),
                (old: unknown) => {
                    const data = old as { pages: Array<ListResponse<Message>>; pageParams: unknown[] } | undefined;
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
        onError: (_err, _content, context) => {
            if (context?.previousMessages && conversationId) {
                queryClient.setQueryData(
                    messageKeys.conversation(conversationId),
                    context.previousMessages
                );
            }
        },

        // Refetch after mutation
        onSettled: () => {
            if (conversationId) {
                queryClient.invalidateQueries({
                    queryKey: messageKeys.conversation(conversationId)
                });
                // Also update conversation list (last message preview)
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }
        },
    });
}

// ============================================================================
// useEditMessage - Edit Message Mutation with Optimistic Update
// ============================================================================

interface EditMessageParams {
    messageId: string;
    content: string;
}

export function useEditMessage(conversationId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ messageId, content }: EditMessageParams) => {
            return editMessage(messageId, content);
        },

        onMutate: async ({ messageId, content }) => {
            if (!conversationId) return;

            await queryClient.cancelQueries({
                queryKey: messageKeys.conversation(conversationId)
            });

            const previousMessages = queryClient.getQueryData(
                messageKeys.conversation(conversationId)
            );

            // Optimistically update the message
            queryClient.setQueryData(
                messageKeys.conversation(conversationId),
                (old: unknown) => {
                    const data = old as { pages: Array<ListResponse<Message>>; pageParams: unknown[] } | undefined;
                    if (!data?.pages) return old;

                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: page.data.map((msg: Message) =>
                                msg.id === messageId
                                    ? { ...msg, content, updatedAt: new Date().toISOString() }
                                    : msg
                            ),
                        })),
                    };
                }
            );

            return { previousMessages };
        },

        onError: (_err, _variables, context) => {
            if (context?.previousMessages && conversationId) {
                queryClient.setQueryData(
                    messageKeys.conversation(conversationId),
                    context.previousMessages
                );
            }
        },
    });
}

// ============================================================================
// useDeleteMessage - Delete Message Mutation with Optimistic Update
// ============================================================================

export function useDeleteMessage(conversationId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (messageId: string) => {
            return deleteMessage(messageId);
        },

        onMutate: async (messageId) => {
            if (!conversationId) return;

            await queryClient.cancelQueries({
                queryKey: messageKeys.conversation(conversationId)
            });

            const previousMessages = queryClient.getQueryData(
                messageKeys.conversation(conversationId)
            );

            // Optimistically remove the message
            queryClient.setQueryData(
                messageKeys.conversation(conversationId),
                (old: unknown) => {
                    const data = old as { pages: Array<ListResponse<Message>>; pageParams: unknown[] } | undefined;
                    if (!data?.pages) return old;

                    return {
                        ...data,
                        pages: data.pages.map((page) => ({
                            ...page,
                            data: page.data.filter((msg: Message) => msg.id !== messageId),
                        })),
                    };
                }
            );

            return { previousMessages };
        },

        onError: (_err, _messageId, context) => {
            if (context?.previousMessages && conversationId) {
                queryClient.setQueryData(
                    messageKeys.conversation(conversationId),
                    context.previousMessages
                );
            }
        },
    });
}
