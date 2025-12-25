// ============================================================================
// Feed API - Backend Integration
// ============================================================================

import { api } from "../../api/client";
import type { Post, ListResponse } from "../../api/types";

export type TimelineFilter = "all" | "friends" | "servers";

export interface CreatePostRequest {
    content: string;
    visibility: "public" | "friends" | "server";
    serverId?: string;
}

// Backend response types
export interface ToggleLikeResponse {
    liked: boolean;
}

export interface ToggleRepostResponse {
    reposted: boolean;
}

export interface ToggleBookmarkResponse {
    bookmarked: boolean;
}

// Fetch feed posts
export async function fetchFeed(params?: {
    cursor?: string;
    limit?: number;
    filter?: TimelineFilter;
}): Promise<ListResponse<Post>> {
    return api.get<ListResponse<Post>>("/api/v1/feed", {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
        filter: params?.filter ?? "all",
    });
}

// Create a new post
export async function createPost(data: CreatePostRequest): Promise<{ data: Post }> {
    return api.post<{ data: Post }>("/api/v1/posts", data);
}

// Toggle like on a post
export async function toggleLike(postId: string): Promise<ToggleLikeResponse> {
    return api.post<ToggleLikeResponse>(`/api/v1/posts/${postId}/like`);
}

// Toggle repost
export async function toggleRepost(postId: string): Promise<ToggleRepostResponse> {
    return api.post<ToggleRepostResponse>(`/api/v1/posts/${postId}/repost`);
}

// Toggle bookmark
export async function toggleBookmark(postId: string): Promise<ToggleBookmarkResponse> {
    return api.post<ToggleBookmarkResponse>(`/api/v1/posts/${postId}/bookmark`);
}

// Fetch posts by a specific user
export async function getUserPosts(userId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<Post>> {
    return api.get<ListResponse<Post>>(`/api/v1/users/${userId}/posts`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}
