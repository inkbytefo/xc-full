// ============================================================================
// Servers API - Backend Integration (Aligned with Backend Response Format)
// ============================================================================

import { api } from "../../api/client";
import type { Server, Channel, ChannelMessage, ServerMember, ListResponse, Role } from "../../api/types";

// ============================================================================
// Server Endpoints
// ============================================================================

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
export async function joinServer(id: string): Promise<void> {
    await api.post(`/api/v1/servers/${id}/join`);
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

// Fetch server roles (RBAC 2.0)
export async function fetchRoles(serverId: string): Promise<Role[]> {
    const res = await api.get<{ data: Role[] }>(`/api/v1/servers/${serverId}/roles`);
    return res.data;
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
    type?: "text" | "voice" | "announcement";
    description?: string;
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
}): Promise<Channel> {
    const res = await api.patch<{ data: Channel }>(`/api/v1/servers/${serverId}/channels/${channelId}`, data);
    return res.data;
}

// Delete a channel
export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}`);
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
