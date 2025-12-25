// ============================================================================
// Voice API - Backend Integration
// ============================================================================

import { api } from "../../api/client";

// Types
export interface VoiceChannel {
    id: string;
    serverId: string;
    name: string;
    type: "voice" | "video" | "stage";
    position: number;
    userLimit: number;
    participantCount: number;
    createdAt: string;
}

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
    channel: VoiceChannel;
}

// ============================================================================
// Voice Channel Endpoints
// ============================================================================

// Get voice channels for a server
export async function getVoiceChannels(serverId: string): Promise<VoiceChannel[]> {
    const res = await api.get<{ data: VoiceChannel[] }>(
        `/api/v1/servers/${serverId}/voice-channels`
    );
    return res.data;
}

// Create a voice channel
export async function createVoiceChannel(
    serverId: string,
    data: { name: string; type?: "voice" | "video" | "stage"; position?: number; userLimit?: number }
): Promise<VoiceChannel> {
    const res = await api.post<{ data: VoiceChannel }>(
        `/api/v1/servers/${serverId}/voice-channels`,
        data
    );
    return res.data;
}

// Delete a voice channel
export async function deleteVoiceChannel(channelId: string): Promise<void> {
    await api.delete(`/api/v1/voice-channels/${channelId}`);
}

// ============================================================================
// Voice Connection Endpoints
// ============================================================================

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
