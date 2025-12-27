// ============================================================================
// Appearance Settings Tab
// ============================================================================

import { useUIStore, type BackgroundTheme } from '../../../store/uiStore';
import { SettingsCard } from './SettingsCard';

interface ThemeOption {
    id: BackgroundTheme;
    name: string;
    icon: string;
    description: string;
}

const backgroundThemes: ThemeOption[] = [
    { id: 'dotwave', name: 'DotWave', icon: '🌊', description: 'Dinamik parçacık ağı' },
    { id: 'topo', name: 'Topo', icon: '🏔️', description: 'Topografik isoline akışı' },
    { id: 'neongrid', name: 'NeonGrid', icon: '⚡', description: 'Neon grid + sweep' },
];

export function AppearanceSettings() {
    const { backgroundTheme, setBackgroundTheme } = useUIStore();

    return (
        <div className="space-y-6">
            {/* Theme Selection */}
            <SettingsCard title="Tema" icon="🎨">
                <div className="flex gap-3">
                    <button className="flex-1 p-4 rounded-lg bg-[#0a0a0f]/80 border-2 border-purple-500 text-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <div className="text-2xl mb-2">🌙</div>
                        <div className="text-white font-medium">Karanlık</div>
                    </button>
                    <button className="flex-1 p-4 rounded-lg bg-white/10 border border-white/20 text-center opacity-50 cursor-not-allowed">
                        <div className="text-2xl mb-2">☀️</div>
                        <div className="text-zinc-400 font-medium">Aydınlık</div>
                        <div className="text-xs text-zinc-500 mt-1">Yakında</div>
                    </button>
                </div>
            </SettingsCard>

            {/* Background Theme */}
            <SettingsCard title="Arkaplan Teması" icon="✨">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {backgroundThemes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => setBackgroundTheme(theme.id)}
                            className={`
                                p-4 rounded-lg border-2 transition-all duration-200 text-center
                                ${backgroundTheme === theme.id
                                    ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                                }
                            `}
                        >
                            <div className="text-2xl mb-2">{theme.icon}</div>
                            <div className="text-white font-medium">{theme.name}</div>
                            <div className="text-xs text-zinc-500 mt-1">{theme.description}</div>
                        </button>
                    ))}
                </div>
            </SettingsCard>
        </div>
    );
}
