// ============================================================================
// Privacy Settings Hook
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import {
    getPrivacySettings,
    updatePrivacySettings,
    type PrivacySettings,
} from '../privacyApi';

interface UsePrivacySettingsReturn {
    settings: PrivacySettings | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    updateSettings: (updates: Partial<PrivacySettings>) => Promise<void>;
    reload: () => Promise<void>;
}

export function usePrivacySettings(): UsePrivacySettingsReturn {
    const [settings, setSettings] = useState<PrivacySettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPrivacySettings();
            setSettings(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gizlilik ayarları yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (updates: Partial<PrivacySettings>) => {
        if (!settings) return;

        setSaving(true);
        setError(null);
        try {
            const updated = await updatePrivacySettings(updates);
            setSettings(updated);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ayarlar güncellenemedi');
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
