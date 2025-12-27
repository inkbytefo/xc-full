// ============================================================================
// Notification Settings API
// ============================================================================

import { api } from '../../api/client';

export interface NotificationSettings {
    likesEnabled: boolean;
    commentsEnabled: boolean;
    followsEnabled: boolean;
    mentionsEnabled: boolean;
    dmEnabled: boolean;
    callsEnabled: boolean;
    voiceEnabled: boolean;
    streamEnabled: boolean;
}

const defaultSettings: NotificationSettings = {
    likesEnabled: true,
    commentsEnabled: true,
    followsEnabled: true,
    mentionsEnabled: true,
    dmEnabled: true,
    callsEnabled: true,
    voiceEnabled: true,
    streamEnabled: true,
};

/**
 * Get user's notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
    try {
        const response = await api.get<{ data: NotificationSettings }>('/api/v1/me/settings/notifications');
        return response.data ?? defaultSettings;
    } catch {
        // Return defaults if API not available yet
        return defaultSettings;
    }
}

/**
 * Update user's notification settings
 */
export async function updateNotificationSettings(
    settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
    const response = await api.put<{ data: NotificationSettings }>('/api/v1/me/settings/notifications', settings);
    return response.data ?? settings as NotificationSettings;
}
