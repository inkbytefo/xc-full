// ============================================================================
// useNotificationSettings Hook
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import {
    getNotificationSettings,
    updateNotificationSettings,
    type NotificationSettings,
} from '../notificationSettingsApi';

interface UseNotificationSettingsReturn {
    settings: NotificationSettings | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    updateSettings: (key: keyof NotificationSettings, value: boolean) => Promise<void>;
    reload: () => Promise<void>;
}

export function useNotificationSettings(): UseNotificationSettingsReturn {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getNotificationSettings();
            setSettings(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Bildirim ayarları yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
        if (!settings) return;

        // Optimistic update
        const prev = settings;
        setSettings({ ...settings, [key]: value });
        setSaving(true);
        setError(null);

        try {
            const updated = await updateNotificationSettings({ [key]: value });
            setSettings({ ...settings, ...updated });
        } catch (e) {
            // Rollback on error
            setSettings(prev);
            setError(e instanceof Error ? e.message : 'Ayar güncellenemedi');
        } finally {
            setSaving(false);
        }
    }, [settings]);

    // Load on mount
    useEffect(() => {
        reload();
    }, [reload]);

    return {
        settings,
        loading,
        saving,
        error,
        updateSettings,
        reload,
    };
}
