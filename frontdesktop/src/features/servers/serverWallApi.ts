// ============================================================================
// Server Wall API - Backend Integration
// ============================================================================

import { api } from "../../api/client";
import type { ListResponse } from "../../api/types";

// Wall post type
export interface ServerWallPost {
    id: string;
    serverId: string;
    authorId: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    // Author info (populated by frontend)
    author?: {
        id: string;
        handle: string;
        displayName: string;
        avatarGradient: [string, string];
    };
}

// ============================================================================
// Endpoints
// ============================================================================

// Get server wall posts
export async function getServerWall(serverId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<ServerWallPost>> {
    return api.get<ListResponse<ServerWallPost>>(`/api/v1/servers/${serverId}/wall`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}

// Create wall post
export async function createWallPost(serverId: string, content: string): Promise<ServerWallPost> {
    const res = await api.post<{ data: ServerWallPost }>(`/api/v1/servers/${serverId}/wall`, {
        content,
    });
    return res.data;
}

// Delete wall post
export async function deleteWallPost(serverId: string, postId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/wall/${postId}`);
}

// Pin wall post
export async function pinWallPost(serverId: string, postId: string): Promise<void> {
    await api.post(`/api/v1/servers/${serverId}/wall/${postId}/pin`);
}

// Unpin wall post
export async function unpinWallPost(serverId: string, postId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/wall/${postId}/pin`);
}
