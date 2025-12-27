// ============================================================================
// Servers API - Backend Integration (Aligned with Backend Response Format)
// ============================================================================

import { api } from "../../api/client";
import type { Server, Channel, ChannelMessage, ServerMember, ListResponse, Role } from "../../api/types";

// ============================================================================
// Server Endpoints
// ============================================================================

export interface JoinServerResult {
    pending: boolean;
}

export interface ServerJoinRequest {
    serverId: string;
    userId: string;
    status: "pending" | "accepted" | "rejected" | string;
    message?: string;
    createdAt: string;
    updatedAt: string;
}

// Fetch user's servers
export async function fetchServers(): Promise<Server[]> {
    const res = await api.get<{ data: Server[] }>("/api/v1/servers");
    return res.data;
}

// Get server details
export async function getServer(id: string): Promise<Server> {
    const res = await api.get<{ data: Server }>(`/api/v1/servers/${id}`);
    return res.data;
}

// Search public servers
export async function searchServers(query: string, limit: number = 20): Promise<Server[]> {
    const res = await api.get<{ data: Server[] }>(`/api/v1/search/servers`, { q: query, limit });
    return res.data;
}

// Create a new server
export async function createServer(data: {
    name: string;
    description?: string;
    isPublic?: boolean;
    accent?: string;
}): Promise<Server> {
    const res = await api.post<{ data: Server }>("/api/v1/servers", data);
    return res.data;
}

// Update a server
export async function updateServer(id: string, data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
}): Promise<Server> {
    const res = await api.patch<{ data: Server }>(`/api/v1/servers/${id}`, data);
    return res.data;
}

// Delete a server
export async function deleteServer(id: string): Promise<void> {
    await api.delete(`/api/v1/servers/${id}`);
}

// Join a server
export async function joinServer(id: string): Promise<JoinServerResult> {
    const res = await api.post<{ data?: { pending?: boolean } } | null>(`/api/v1/servers/${id}/join`);
    const pending = (res as { data?: { pending?: boolean } } | null)?.data?.pending === true;
    return { pending };
}

// Leave a server
export async function leaveServer(id: string): Promise<void> {
    await api.post(`/api/v1/servers/${id}/leave`);
}

// Get server members
export async function getServerMembers(serverId: string): Promise<ServerMember[]> {
    const res = await api.get<{ data: ServerMember[] }>(`/api/v1/servers/${serverId}/members`);
    return res.data;
}

// Remove a member from server
export async function removeMember(serverId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/members/${userId}`);
}

export async function getServerJoinRequests(serverId: string): Promise<ServerJoinRequest[]> {
    const res = await api.get<{ data: ServerJoinRequest[] }>(`/api/v1/servers/${serverId}/join-requests`);
    return res.data;
}

export async function acceptServerJoinRequest(serverId: string, userId: string): Promise<void> {
    await api.post(`/api/v1/servers/${serverId}/join-requests/${userId}/accept`);
}

export async function rejectServerJoinRequest(serverId: string, userId: string): Promise<void> {
    await api.post(`/api/v1/servers/${serverId}/join-requests/${userId}/reject`);
}

// Fetch server roles (RBAC 2.0)
export async function fetchRoles(serverId: string): Promise<Role[]> {
    const res = await api.get<{ data: Role[] }>(`/api/v1/servers/${serverId}/roles`);
    return res.data;
}

export async function createRole(serverId: string, data: { name: string; color: string; permissions: number }): Promise<Role> {
    const res = await api.post<{ data: Role }>(`/api/v1/servers/${serverId}/roles`, data);
    return res.data;
}

export async function updateRole(serverId: string, roleId: string, data: { name?: string; color?: string; permissions?: number; position?: number }): Promise<Role> {
    const res = await api.patch<{ data: Role }>(`/api/v1/servers/${serverId}/roles/${roleId}`, data);
    return res.data;
}

export async function deleteRole(serverId: string, roleId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/roles/${roleId}`);
}

export async function updateMemberRoles(serverId: string, userId: string, roleIds: string[]): Promise<void> {
    await api.put(`/api/v1/servers/${serverId}/members/${userId}/roles`, { roleIds });
}

// ============================================================================
// Moderation Endpoints
// ============================================================================

export async function banMember(serverId: string, userId: string, reason: string): Promise<void> {
    await api.post(`/api/v1/servers/${serverId}/bans`, { userId, reason });
}

export async function unbanMember(serverId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/bans/${userId}`);
}

export async function getBans(serverId: string): Promise<import("../../api/types").Ban[]> {
    const res = await api.get<{ data: import("../../api/types").Ban[] }>(`/api/v1/servers/${serverId}/bans`);
    return res.data;
}

export async function timeoutMember(serverId: string, userId: string, durationSeconds: number, reason: string): Promise<void> {
    await api.post(`/api/v1/servers/${serverId}/members/${userId}/timeout`, { durationSeconds, reason });
}

export async function removeTimeout(serverId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/members/${userId}/timeout`);
}

// ============================================================================
// Channel Endpoints
// ============================================================================

// Fetch server channels
export async function fetchChannels(serverId: string): Promise<Channel[]> {
    const res = await api.get<{ data: Channel[] }>(`/api/v1/servers/${serverId}/channels`);
    return res.data;
}

// Create a channel
export async function createChannel(serverId: string, data: {
    name: string;
    type?: "text" | "voice" | "video" | "announcement" | "stage" | "hybrid";
    description?: string;
    userLimit?: number;
    bitrate?: number;
    parentId?: string;
}): Promise<Channel> {
    const res = await api.post<{ data: Channel }>(`/api/v1/servers/${serverId}/channels`, {
        ...data,
        type: data.type ?? "text",
    });
    return res.data;
}

// Update a channel
export async function updateChannel(serverId: string, channelId: string, data: {
    name?: string;
    description?: string;
    userLimit?: number;
    bitrate?: number;
    parentId?: string;
}): Promise<Channel> {
    const res = await api.patch<{ data: Channel }>(`/api/v1/servers/${serverId}/channels/${channelId}`, data);
    return res.data;
}

// Delete a channel
export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}`);
}

// Update channel position (single channel)
export async function updateChannelPosition(
    serverId: string,
    channelId: string,
    position: number,
    parentId?: string | null
): Promise<Channel> {
    const res = await api.patch<{ data: Channel }>(`/api/v1/servers/${serverId}/channels/${channelId}`, {
        position,
        ...(parentId !== undefined && { parentId }),
    });
    return res.data;
}

// Bulk update channel positions (for drag and drop)
export interface ChannelPositionUpdate {
    id: string;
    position: number;
    parentId?: string | null;
}

export async function reorderChannels(
    serverId: string,
    updates: ChannelPositionUpdate[]
): Promise<void> {
    // Try bulk endpoint first, fallback to individual updates
    try {
        await api.patch(`/api/v1/servers/${serverId}/channels/reorder`, { updates });
    } catch (error) {
        // Fallback: update each channel individually
        console.warn("Bulk reorder not available, using individual updates");
        for (const update of updates) {
            await api.patch(`/api/v1/servers/${serverId}/channels/${update.id}`, {
                position: update.position,
                ...(update.parentId !== undefined && { parentId: update.parentId }),
            });
        }
    }
}

// ============================================================================
// Channel Message Endpoints
// ============================================================================

// Fetch channel messages
export async function fetchChannelMessages(serverId: string, channelId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<ChannelMessage>> {
    return api.get<ListResponse<ChannelMessage>>(`/api/v1/servers/${serverId}/channels/${channelId}/messages`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 50,
    });
}

// Send message to channel
export async function sendChannelMessage(serverId: string, channelId: string, content: string, replyToId?: string): Promise<ChannelMessage> {
    const res = await api.post<{ data: ChannelMessage }>(`/api/v1/servers/${serverId}/channels/${channelId}/messages`, {
        content,
        replyToId,
    });
    return res.data;
}

// Edit a channel message
export async function editChannelMessage(serverId: string, channelId: string, messageId: string, content: string): Promise<ChannelMessage> {
    const res = await api.patch<{ data: ChannelMessage }>(`/api/v1/servers/${serverId}/channels/${channelId}/messages/${messageId}`, { content });
    return res.data;
}

// Delete a channel message
export async function deleteChannelMessage(serverId: string, channelId: string, messageId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}/messages/${messageId}`);
}

// Search messages in a channel
export async function searchChannelMessages(serverId: string, channelId: string, query: string): Promise<ChannelMessage[]> {
    const res = await api.get<{ data: ChannelMessage[] }>(`/api/v1/servers/${serverId}/channels/${channelId}/messages/search`, { q: query });
    return res.data;
}

// Acknowledge read messages
export async function ackChannelMessage(serverId: string, channelId: string, messageId: string): Promise<void> {
    await api.post(`/api/v1/servers/${serverId}/channels/${channelId}/ack`, { message_id: messageId });
}
