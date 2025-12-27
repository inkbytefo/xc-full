// ============================================================================
// Notification Settings Tab
// ============================================================================

import { SettingsCard, SettingRow } from './SettingsCard';
import { Toggle } from './Toggle';
import { VolumeSlider } from './VolumeSlider';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import type { NotificationSettings as NotificationSettingsType } from '../notificationSettingsApi';

interface NotificationItem {
    id: keyof NotificationSettingsType;
    label: string;
    description: string;
}

const notificationTypes: NotificationItem[] = [
    { id: 'likesEnabled', label: 'Beğeniler', description: 'Birisi gönderini beğendiğinde' },
    { id: 'commentsEnabled', label: 'Yorumlar', description: 'Birisi gönderine yorum yaptığında' },
    { id: 'followsEnabled', label: 'Takipçiler', description: 'Birisi seni takip ettiğinde' },
    { id: 'mentionsEnabled', label: 'Bahsetmeler', description: 'Birisi senden bahsettiğinde' },
    { id: 'dmEnabled', label: 'Direkt Mesajlar', description: 'Yeni mesaj aldığında' },
    { id: 'callsEnabled', label: 'Aramalar', description: 'Sesli/görüntülü arama bildirimleri' },
    { id: 'voiceEnabled', label: 'Sesli Sohbet', description: 'Katılım/ayrılış bildirimleri' },
    { id: 'streamEnabled', label: 'Canlı Yayınlar', description: 'Takip ettiklerin yayına başladığında' },
];

export function NotificationSettings() {
    const { settings, loading, saving, updateSettings } = useNotificationSettings();

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            {/* Volume Control */}
            <SettingsCard title="Bildirim Sesi" icon="🔊">
                <VolumeSlider />
            </SettingsCard>

            {/* Notification Types */}
            <SettingsCard title="Bildirim Türleri" icon="🔔">
                {notificationTypes.map((item) => (
                    <SettingRow key={item.id} label={item.label} description={item.description}>
                        <Toggle
                            checked={settings?.[item.id] ?? true}
                            onChange={(checked) => updateSettings(item.id, checked)}
                            disabled={saving}
                        />
                    </SettingRow>
                ))}
            </SettingsCard>

            {/* Saving Indicator */}
            {saving && (
                <div className="fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm flex items-center gap-2 shadow-lg shadow-purple-500/30 animate-pulse">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Kaydediliyor...
                </div>
            )}
        </div>
    );
}
