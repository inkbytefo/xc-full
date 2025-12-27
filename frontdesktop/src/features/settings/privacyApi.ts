// ============================================================================
// Privacy API - Backend Integration
// ============================================================================

import { api } from "../../api/client";

// Types
export interface PrivacySettings {
    onlineStatusVisibility: "everyone" | "friends" | "nobody";
    dmPermission: "everyone" | "friends" | "server_members" | "nobody";
    profileVisibility: "public" | "friends" | "private";
    showActivity: boolean;
    readReceiptsEnabled: boolean;
    typingIndicatorsEnabled: boolean;
    friendRequestPermission: "everyone" | "friends_of_friends" | "nobody";
    showServerTags: boolean;
}

export interface UpdatePrivacyRequest {
    onlineStatusVisibility?: string;
    dmPermission?: string;
    profileVisibility?: string;
    showActivity?: boolean;
    readReceiptsEnabled?: boolean;
    typingIndicatorsEnabled?: boolean;
    friendRequestPermission?: string;
    showServerTags?: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get current user's privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
    const res = await api.get<{ data: PrivacySettings }>("/api/v1/me/privacy");
    return res.data;
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
    settings: UpdatePrivacyRequest
): Promise<PrivacySettings> {
    const res = await api.patch<{ data: PrivacySettings }>("/api/v1/me/privacy", settings);
    return res.data;
}

/**
 * Check if current user can send DM to target user
 */
export async function checkCanSendDM(userId: string): Promise<boolean> {
    const res = await api.get<{ data: { canSendDM: boolean } }>(`/api/v1/users/${userId}/can-dm`);
    return res.data.canSendDM;
}

// ============================================================================
// Helper functions for UI labels
// ============================================================================

export const onlineStatusOptions = [
    { value: "everyone", label: "Herkes", description: "Herkes çevrimiçi durumunuzu görebilir" },
    { value: "friends", label: "Arkadaşlar", description: "Sadece arkadaşlarınız görebilir" },
    { value: "nobody", label: "Kimse", description: "Kimse göremez (çevrimdışı görünürsünüz)" },
];

export const dmPermissionOptions = [
    { value: "everyone", label: "Herkes", description: "Herkes size DM gönderebilir" },
    { value: "friends", label: "Arkadaşlar", description: "Sadece arkadaşlarınız gönderebilir" },
    { value: "server_members", label: "Sunucu Üyeleri", description: "Aynı sunucudaki üyeler gönderebilir" },
    { value: "nobody", label: "Kimse", description: "Hiç kimse DM gönderemez" },
];

export const profileVisibilityOptions = [
    { value: "public", label: "Herkese Açık", description: "Profiliniz herkese görünür" },
    { value: "friends", label: "Arkadaşlar", description: "Sadece arkadaşlarınız görebilir" },
    { value: "private", label: "Gizli", description: "Temel bilgiler hariç kimse göremez" },
];

export const friendRequestOptions = [
    { value: "everyone", label: "Herkes", description: "Herkes arkadaşlık isteği gönderebilir" },
    { value: "friends_of_friends", label: "Arkadaşların Arkadaşları", description: "Ortak arkadaşları olanlar gönderebilir" },
    { value: "nobody", label: "Kimse", description: "Hiç kimse istek gönderemez" },
];
