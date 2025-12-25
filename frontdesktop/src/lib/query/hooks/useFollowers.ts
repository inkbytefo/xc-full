// ============================================================================
// useFollowers Hook - Followers/Following with React Query
// ============================================================================
// Provides hooks for fetching followers/following lists with infinite scroll
// and follow/unfollow mutations with optimistic updates.

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getUserFollowers,
    getUserFollowing,
    followUser,
    unfollowUser,
    type UserProfile,
    type FollowResult,
} from '../../../features/profile/userApi';
import type { ListResponse } from '../../../api/types';

// ============================================================================
// Query Keys
// ============================================================================

export const followerKeys = {
    all: ['followers'] as const,
    followers: (userId: string) => ['followers', userId] as const,
    following: (userId: string) => ['following', userId] as const,
};

// ============================================================================
// useFollowers - Infinite Query for User's Followers
// ============================================================================

export function useFollowers(userId: string | null) {
    return useInfiniteQuery<ListResponse<UserProfile>>({
        queryKey: userId ? followerKeys.followers(userId) : ['followers', 'none'],
        queryFn: async ({ pageParam }) => {
            if (!userId) {
                return { data: [], nextCursor: undefined };
            }
            return getUserFollowers(userId, {
                cursor: pageParam as string | undefined,
                limit: 20,
            });
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================================================
// useFollowing - Infinite Query for Users the User is Following
// ============================================================================

export function useFollowing(userId: string | null) {
    return useInfiniteQuery<ListResponse<UserProfile>>({
        queryKey: userId ? followerKeys.following(userId) : ['following', 'none'],
        queryFn: async ({ pageParam }) => {
            if (!userId) {
                return { data: [], nextCursor: undefined };
            }
            return getUserFollowing(userId, {
                cursor: pageParam as string | undefined,
                limit: 20,
            });
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================================================
// useFollowUser - Follow User Mutation with Optimistic Update
// ============================================================================

export function useFollowUser() {
    const queryClient = useQueryClient();

    return useMutation<FollowResult, Error, string>({
        mutationFn: (userId: string) => followUser(userId),

        onSuccess: (_data, userId) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({
                queryKey: followerKeys.followers(userId)
            });
            // Invalidate the user's profile to update isFollowing status
            queryClient.invalidateQueries({
                queryKey: ['user', userId]
            });
        },
    });
}

// ============================================================================
// useUnfollowUser - Unfollow User Mutation with Optimistic Update
// ============================================================================

export function useUnfollowUser() {
    const queryClient = useQueryClient();

    return useMutation<{ following: boolean }, Error, string>({
        mutationFn: (userId: string) => unfollowUser(userId),

        onSuccess: (_data, userId) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({
                queryKey: followerKeys.followers(userId)
            });
            // Invalidate the user's profile to update isFollowing status
            queryClient.invalidateQueries({
                queryKey: ['user', userId]
            });
        },
    });
}

// ============================================================================
// useToggleFollow - Combined hook for toggle behavior
// ============================================================================

export function useToggleFollow() {
    const followMutation = useFollowUser();
    const unfollowMutation = useUnfollowUser();

    const toggle = async (userId: string, isCurrentlyFollowing: boolean) => {
        if (isCurrentlyFollowing) {
            return unfollowMutation.mutateAsync(userId);
        } else {
            return followMutation.mutateAsync(userId);
        }
    };

    return {
        toggle,
        isLoading: followMutation.isPending || unfollowMutation.isPending,
        followMutation,
        unfollowMutation,
    };
}
