// ============================================================================
// useUserProfile Hook - React Query Based User Profile
// ============================================================================
// Provides user profile fetching with caching and auto-refresh.
// Integrates with auth store for current user detection.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { getUser, getUserByHandle, updateProfile, type UserProfile } from '../userApi';

// ============================================================================
// Query Keys
// ============================================================================

export const userKeys = {
    all: ['users'] as const,
    detail: (userId: string) => ['user', 'id', userId] as const,
    handle: (handle: string) => ['user', 'handle', handle] as const,
    me: ['user', 'me'] as const,
};

// ============================================================================
// useUserProfile - Query for User Profile
// ============================================================================

interface UseUserProfileOptions {
    userId?: string | null;
    handle?: string | null;
    enabled?: boolean;
}

export function useUserProfile(options: UseUserProfileOptions = {}) {
    const currentUser = useAuthStore((s) => s.user);
    const { userId, handle, enabled = true } = options;

    // Determine target
    // Priority: handle -> userId -> currentUser
    const targetHandle = handle;
    const targetUserId = !handle ? (userId || currentUser?.id || null) : null;

    const isOwnProfile =
        (!!targetHandle && targetHandle === currentUser?.handle) ||
        (!!targetUserId && targetUserId === currentUser?.id);

    const queryKey = targetHandle
        ? userKeys.handle(targetHandle)
        : (targetUserId ? userKeys.detail(targetUserId) : userKeys.me);

    const query = useQuery<UserProfile | null>({
        queryKey,
        queryFn: async () => {
            if (targetHandle) return getUserByHandle(targetHandle);
            if (targetUserId) return getUser(targetUserId);
            return null;
        },
        enabled: enabled && (!!targetUserId || !!targetHandle),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // For own profile, merge with authStore data as fallback
    const profile = query.data ?? (isOwnProfile && currentUser ? {
        id: currentUser.id,
        handle: currentUser.handle,
        displayName: currentUser.displayName,
        avatarGradient: (currentUser.avatarGradient || ['#8B5CF6', '#EC4899']) as [string, string],
        avatarUrl: currentUser.avatarUrl,
        bannerUrl: currentUser.bannerUrl,
        bio: currentUser.bio || '',
        isVerified: currentUser.isVerified || false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: currentUser.createdAt || new Date().toISOString(),
    } as UserProfile : null);

    return {
        profile,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        isOwnProfile,
        currentUser,
    };
}

// ============================================================================
// useUpdateProfile - Mutation for Profile Updates
// ============================================================================

interface UpdateProfileData {
    displayName?: string;
    bio?: string;
    avatarGradient?: [string, string];
    avatarUrl?: string;
    bannerUrl?: string;
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const setUser = useAuthStore((s) => s.setUser);
    const currentUser = useAuthStore((s) => s.user);

    return useMutation<UserProfile, Error, UpdateProfileData>({
        mutationFn: (data) => updateProfile(data),

        onSuccess: (updatedUser) => {
            // Update auth store
            if (currentUser) {
                setUser({
                    ...currentUser,
                    displayName: updatedUser.displayName,
                    bio: updatedUser.bio,
                    avatarGradient: updatedUser.avatarGradient,
                    avatarUrl: updatedUser.avatarUrl,
                    bannerUrl: updatedUser.bannerUrl,
                });
            }

            // Invalidate profile queries
            queryClient.invalidateQueries({
                queryKey: userKeys.all,
            });
        },
    });
}
