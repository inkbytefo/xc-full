// ============================================================================
// About Settings Tab
// ============================================================================

import { SettingsCard } from './SettingsCard';

export function AboutSettings() {
    return (
        <SettingsCard>
            <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎮</div>
                <h3 className="text-2xl font-bold text-white">XCORD</h3>
                <p className="text-zinc-400">Versiyon 0.1.0</p>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-3 text-center text-zinc-400 text-sm">
                <p>© 2024 XCORD. Tüm hakları saklıdır.</p>
                <div className="flex justify-center gap-4">
                    <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Gizlilik Politikası
                    </a>
                    <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Kullanım Şartları
                    </a>
                </div>
            </div>
        </SettingsCard>
    );
}
