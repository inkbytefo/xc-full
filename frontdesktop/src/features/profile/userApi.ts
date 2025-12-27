// ============================================================================
// User API - Backend Integration
// ============================================================================

import { api } from "../../api/client";
import type { ListResponse } from "../../api/types";

// User profile type
export interface UserProfile {
    id: string;
    handle: string;
    displayName: string;
    email?: string;
    avatarGradient: [string, string];
    avatarUrl?: string;
    bannerUrl?: string;
    bio?: string;
    isVerified: boolean;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    isFollowing?: boolean;
    isFollowedBy?: boolean;
    createdAt: string;
}

// ============================================================================
// Endpoints
// ============================================================================

// Get another user's profile
export async function getUser(userId: string): Promise<UserProfile> {
    const res = await api.get<{ data: UserProfile }>(`/api/v1/users/${userId}`);
    return res.data;
}

// Get another user's profile by handle
export async function getUserByHandle(handle: string): Promise<UserProfile> {
    const res = await api.get<{ data: UserProfile }>(`/api/v1/users/handle/${handle}`);
    return res.data;
}

// Update current user's profile
export async function updateProfile(data: {
    displayName?: string;
    bio?: string;
    avatarGradient?: [string, string];
    avatarUrl?: string;
    bannerUrl?: string;
}): Promise<UserProfile> {
    const res = await api.patch<{ data: UserProfile }>("/api/v1/me", data);
    return res.data;
}

// Follow a user (returns pending status for private accounts)
export interface FollowResult {
    following: boolean;
    pending: boolean;
    status: "active" | "pending" | "blocked";
}

export async function followUser(userId: string): Promise<FollowResult> {
    const res = await api.post<{ data: FollowResult }>(`/api/v1/users/${userId}/follow`);
    return res.data;
}

// Unfollow a user
export async function unfollowUser(userId: string): Promise<{ following: boolean }> {
    const res = await api.delete<{ data: { following: boolean } }>(`/api/v1/users/${userId}/follow`);
    return res.data;
}

// Get user's followers
export async function getUserFollowers(userId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<UserProfile>> {
    return api.get<ListResponse<UserProfile>>(`/api/v1/users/${userId}/followers`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}

// Get user's following
export async function getUserFollowing(userId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<UserProfile>> {
    return api.get<ListResponse<UserProfile>>(`/api/v1/users/${userId}/following`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}

// Search users
export async function searchUsers(query: string, limit?: number): Promise<UserProfile[]> {
    const res = await api.get<{ data: UserProfile[] }>("/api/v1/search/users", {
        q: query,
        limit: limit ?? 10,
    });
    return res.data;
}

// ============================================================================
// Follow Request Endpoints (Instagram-style)
// ============================================================================

// Get pending follow requests (for private accounts)
export async function getFollowRequests(params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<UserProfile>> {
    return api.get<ListResponse<UserProfile>>("/api/v1/me/follow-requests", {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}

// Accept a follow request
export async function acceptFollowRequest(requesterId: string): Promise<{ accepted: boolean }> {
    const res = await api.post<{ data: { accepted: boolean } }>(
        `/api/v1/me/follow-requests/${requesterId}/accept`
    );
    return res.data;
}

// Reject a follow request
export async function rejectFollowRequest(requesterId: string): Promise<{ rejected: boolean }> {
    const res = await api.post<{ data: { rejected: boolean } }>(
        `/api/v1/me/follow-requests/${requesterId}/reject`
    );
    return res.data;
}

// Block a user
export async function blockUser(userId: string): Promise<{ blocked: boolean }> {
    const res = await api.post<{ data: { blocked: boolean } }>(`/api/v1/users/${userId}/block`);
    return res.data;
}
