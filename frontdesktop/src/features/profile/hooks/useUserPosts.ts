// ============================================================================
// useUserPosts Hook - React Query Based User Posts
// ============================================================================
// Fetches posts for a specific user with caching.

import { useQuery } from '@tanstack/react-query';
import { getUserPosts } from '../../feed/feedApi';
import type { Post } from '../../../api/types';

// ============================================================================
// Query Keys
// ============================================================================

export const userPostKeys = {
    all: ['userPosts'] as const,
    list: (userId: string) => ['userPosts', userId] as const,
};

// ============================================================================
// useUserPosts - Query for User's Posts
// ============================================================================

interface UseUserPostsOptions {
    userId: string | null | undefined;
    enabled?: boolean;
}

export function useUserPosts(options: UseUserPostsOptions) {
    const { userId, enabled = true } = options;

    return useQuery<Post[]>({
        queryKey: userId ? userPostKeys.list(userId) : ['userPosts', 'none'],
        queryFn: async () => {
            if (!userId) return [];
            const res = await getUserPosts(userId);
            return res.data;
        },
        enabled: enabled && !!userId,
        staleTime: 1000 * 60 * 1, // 1 minute
    });
}
