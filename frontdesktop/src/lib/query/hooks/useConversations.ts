// ============================================================================
// useConversations Hook - DM Conversations with React Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConversations, startConversation, markAsRead } from '../../../features/dm/dmApi';
import type { Conversation } from '../../../api/types';

// ============================================================================
// Query Keys
// ============================================================================

export const conversationKeys = {
    all: ['conversations'] as const,
    detail: (id: string) => ['conversations', id] as const,
};

// ============================================================================
// useConversations - Fetch All Conversations
// ============================================================================

export function useConversations() {
    return useQuery({
        queryKey: conversationKeys.all,
        queryFn: fetchConversations,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// ============================================================================
// useStartConversation - Create New Conversation
// ============================================================================

export function useStartConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => startConversation(userId),

        onSuccess: (newConversation) => {
            // Add new conversation to cache
            queryClient.setQueryData<Conversation[]>(
                conversationKeys.all,
                (old) => old ? [newConversation, ...old] : [newConversation]
            );
        },
    });
}

// ============================================================================
// useMarkAsRead - Mark Conversation as Read
// ============================================================================

export function useMarkAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: string) => markAsRead(conversationId),

        onMutate: async (conversationId) => {
            // Optimistically update unread count
            const previousConversations = queryClient.getQueryData<Conversation[]>(
                conversationKeys.all
            );

            queryClient.setQueryData<Conversation[]>(
                conversationKeys.all,
                (old) => old?.map((conv) =>
                    conv.id === conversationId
                        ? { ...conv, unreadCount: 0 }
                        : conv
                )
            );

            return { previousConversations };
        },

        onError: (_err, _conversationId, context) => {
            if (context?.previousConversations) {
                queryClient.setQueryData(
                    conversationKeys.all,
                    context.previousConversations
                );
            }
        },
    });
}
