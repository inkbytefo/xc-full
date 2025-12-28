// ============================================================================
// Server Voice API - For Server Channels
// ============================================================================

import { api } from "../../../api/client";
import type { Channel } from "../../../api/types";

export interface VoiceParticipant {
    identity: string;
    sid: string;
    state: string;
    joinedAt: number;
    isSpeaking: boolean;
}

export interface VoiceToken {
    token: string;
    roomName: string;
    channel: Channel;
}

// Get voice channels for a server
export async function getVoiceChannels(serverId: string): Promise<Channel[]> {
    const res = await api.get<{ data: Channel[] }>(
        `/api/v1/servers/${serverId}/voice-channels`
    );
    return res.data;
}

// Create a voice channel
export async function createVoiceChannel(
    serverId: string,
    data: { name: string; type?: "voice" | "video" | "stage"; position?: number; userLimit?: number; parentId?: string }
): Promise<Channel> {
    const res = await api.post<{ data: Channel }>(
        `/api/v1/servers/${serverId}/voice-channels`,
        data
    );
    return res.data;
}

// Delete a voice channel
export async function deleteVoiceChannel(channelId: string): Promise<void> {
    await api.delete(`/api/v1/voice-channels/${channelId}`);
}

// Get voice token to join a channel
export async function getVoiceToken(channelId: string): Promise<VoiceToken> {
    const res = await api.post<{ data: VoiceToken }>(
        `/api/v1/voice-channels/${channelId}/token`
    );
    return res.data;
}

// Get participants in a voice channel
export async function getParticipants(channelId: string): Promise<VoiceParticipant[]> {
    const res = await api.get<{ data: VoiceParticipant[] }>(
        `/api/v1/voice-channels/${channelId}/participants`
    );
    return res.data;
}
