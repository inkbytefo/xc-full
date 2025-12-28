// ============================================================================
// Servers API - Minimal Stub (Placeholder)
// ============================================================================
// This file provides stub functions for servers API calls.
// Full implementation will be added when servers feature is re-implemented.
// ============================================================================

import type { Server, Channel, ChannelMessage, ServerMember } from '../../api/types';
import { api } from '../../api/client';

// ============================================================================
// SEARCH
// ============================================================================

export async function searchServers(query: string, limit = 10): Promise<Server[]> {
    try {
        const response = await api.get<Server[]>('/api/v1/servers/search', {
            q: query,
            limit
        });
        return response || [];
    } catch (error) {
        console.error('Failed to search servers:', error);
        return [];
    }
}

// ============================================================================
// SERVERS
// ============================================================================

export async function fetchServers(): Promise<Server[]> {
    try {
        const response = await api.get<Server[]>('/api/v1/servers');
        return response || [];
    } catch (error) {
        console.error('Failed to fetch servers:', error);
        return [];
    }
}

export async function getServer(serverId: string): Promise<Server> {
    const response = await api.get<Server>(`/api/v1/servers/${serverId}`);
    return response;
}

export async function createServer(data: { name: string; description?: string; isPublic?: boolean }): Promise<Server> {
    const response = await api.post<Server>('/api/v1/servers', data);
    return response;
}

export async function getServerMembers(serverId: string): Promise<ServerMember[]> {
    try {
        const response = await api.get<ServerMember[]>(`/api/v1/servers/${serverId}/members`);
        return response || [];
    } catch (error) {
        console.error('Failed to fetch server members:', error);
        return [];
    }
}

// ============================================================================
// CHANNELS
// ============================================================================

export async function fetchChannels(serverId: string): Promise<Channel[]> {
    try {
        const response = await api.get<Channel[]>(`/api/v1/servers/${serverId}/channels`);
        return response || [];
    } catch (error) {
        console.error('Failed to fetch channels:', error);
        return [];
    }
}

// ============================================================================
// CHANNEL MESSAGES
// ============================================================================

export async function fetchChannelMessages(
    serverId: string,
    channelId: string,
    options?: { cursor?: string; limit?: number }
): Promise<{ data: ChannelMessage[]; nextCursor?: string }> {
    try {
        const params: Record<string, string | number | undefined> = {
            limit: options?.limit ?? 50,
        };
        if (options?.cursor) {
            params.cursor = options.cursor;
        }
        const response = await api.get<ChannelMessage[]>(
            `/api/v1/servers/${serverId}/channels/${channelId}/messages`,
            params
        );
        return {
            data: response || [],
            nextCursor: undefined, // Pagination cursor would come from API headers/response
        };
    } catch (error) {
        console.error('Failed to fetch channel messages:', error);
        return { data: [], nextCursor: undefined };
    }
}

export async function sendChannelMessage(
    serverId: string,
    channelId: string,
    content: string,
    _replyToId?: string
): Promise<ChannelMessage> {
    const response = await api.post<ChannelMessage>(
        `/api/v1/servers/${serverId}/channels/${channelId}/messages`,
        { content }
    );
    return response;
}

export async function editChannelMessage(
    serverId: string,
    channelId: string,
    messageId: string,
    content: string
): Promise<ChannelMessage> {
    const response = await api.patch<ChannelMessage>(
        `/api/v1/servers/${serverId}/channels/${channelId}/messages/${messageId}`,
        { content }
    );
    return response;
}

export async function deleteChannelMessage(
    serverId: string,
    channelId: string,
    messageId: string
): Promise<void> {
    await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}/messages/${messageId}`);
}

export async function ackChannelMessage(
    serverId: string,
    channelId: string,
    messageId: string
): Promise<void> {
    await api.post(
        `/api/v1/servers/${serverId}/channels/${channelId}/messages/${messageId}/ack`,
        {}
    );
}

// ============================================================================
// PLACEHOLDER EXPORTS
// ============================================================================

export async function joinServer(_serverId: string): Promise<boolean> {
    return false;
}

export async function leaveServer(_serverId: string): Promise<boolean> {
    return false;
}

// Export type for channel that ChannelSidebar might expect
export interface VoiceChannel {
    id: string;
    name: string;
    type: 'voice' | 'video' | 'hybrid';
    position?: number;
}
