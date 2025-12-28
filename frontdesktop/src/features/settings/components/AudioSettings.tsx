// ============================================================================
// Audio Settings Tab
// ============================================================================

import { AudioDeviceSettings } from './AudioDeviceSettings';
import { SettingsCard } from './SettingsCard';
import { VolumeSlider } from './VolumeSlider';

export function AudioSettings() {
    return (
        <div className="space-y-6">
            {/* Notification Volume */}
            <SettingsCard title="Bildirim Sesi" icon="🔊">
                <VolumeSlider />
            </SettingsCard>

            {/* Voice Devices */}
            <div className="rounded-xl overflow-hidden">
                <AudioDeviceSettings />
            </div>
        </div>
    );
}
