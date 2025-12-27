// ============================================================================
// Privacy Settings Tab
// ============================================================================

import { SettingsCard, SettingRow } from './SettingsCard';
import { SelectOption } from './SelectOption';
import { Toggle } from './Toggle';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import {
    onlineStatusOptions,
    dmPermissionOptions,
    profileVisibilityOptions,
    friendRequestOptions,
    type PrivacySettings as PrivacySettingsType,
} from '../privacyApi';

export function PrivacySettings() {
    const { settings, loading, saving, error, updateSettings } = usePrivacySettings();

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
            </div>
        );
    }

    if (!settings) {
        return null;
    }

    return (
        <div className="space-y-6 relative">
            {/* Visibility Settings */}
            <SettingsCard title="Görünürlük Ayarları" icon="👁️">
                <SelectOption
                    label="Çevrimiçi Durumu"
                    description="Çevrimiçi olduğunuzu kimler görebilir"
                    value={settings.onlineStatusVisibility}
                    options={onlineStatusOptions}
                    onChange={(value) => updateSettings({ onlineStatusVisibility: value as PrivacySettingsType['onlineStatusVisibility'] })}
                    disabled={saving}
                />

                <SelectOption
                    label="Profil Görünürlüğü"
                    description="Profilinizi kimler görebilir"
                    value={settings.profileVisibility}
                    options={profileVisibilityOptions}
                    onChange={(value) => updateSettings({ profileVisibility: value as PrivacySettingsType['profileVisibility'] })}
                    disabled={saving}
                />

                <SettingRow label="Aktivite Durumu" description="Ne oynadığınız/dinlediğiniz gösterilsin">
                    <Toggle
                        checked={settings.showActivity}
                        onChange={(checked) => updateSettings({ showActivity: checked })}
                        disabled={saving}
                    />
                </SettingRow>
            </SettingsCard>

            {/* Messaging Settings */}
            <SettingsCard title="Mesajlaşma Ayarları" icon="💬">
                <SelectOption
                    label="Direkt Mesaj İzni"
                    description="Size kimler DM gönderebilir"
                    value={settings.dmPermission}
                    options={dmPermissionOptions}
                    onChange={(value) => updateSettings({ dmPermission: value as PrivacySettingsType['dmPermission'] })}
                    disabled={saving}
                />

                <SettingRow label="Okundu Bilgisi" description="Mesajları okuduğunuzda gösterilsin">
                    <Toggle
                        checked={settings.readReceiptsEnabled}
                        onChange={(checked) => updateSettings({ readReceiptsEnabled: checked })}
                        disabled={saving}
                    />
                </SettingRow>

                <SettingRow label="Yazıyor Göstergesi" description="Yazıyor... durumunuz gösterilsin">
                    <Toggle
                        checked={settings.typingIndicatorsEnabled}
                        onChange={(checked) => updateSettings({ typingIndicatorsEnabled: checked })}
                        disabled={saving}
                    />
                </SettingRow>
            </SettingsCard>

            {/* Social Settings */}
            <SettingsCard title="Sosyal Ayarlar" icon="🤝">
                <SelectOption
                    label="Arkadaşlık İstekleri"
                    description="Size kimler arkadaşlık isteği gönderebilir"
                    value={settings.friendRequestPermission}
                    options={friendRequestOptions}
                    onChange={(value) => updateSettings({ friendRequestPermission: value as PrivacySettingsType['friendRequestPermission'] })}
                    disabled={saving}
                />

                <SettingRow label="Sunucu Tag'leri" description="Profilinizde sunucu rol tag'lerinizi gösterin">
                    <Toggle
                        checked={settings.showServerTags}
                        onChange={(checked) => updateSettings({ showServerTags: checked })}
                        disabled={saving}
                    />
                </SettingRow>
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
