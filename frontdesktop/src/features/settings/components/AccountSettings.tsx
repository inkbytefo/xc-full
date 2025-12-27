// ============================================================================
// Account Settings Tab
// ============================================================================

import { useAuthStore } from '../../../store/authStore';
import { SettingsCard } from './SettingsCard';

export function AccountSettings() {
    const user = useAuthStore((s) => s.user);

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <SettingsCard>
                <div className="flex items-center gap-4 mb-6">
                    <div
                        className="w-20 h-20 rounded-full shadow-lg"
                        style={{
                            backgroundImage: user?.avatarGradient
                                ? `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`
                                : 'linear-gradient(135deg, #333, #666)',
                        }}
                    />
                    <div>
                        <h3 className="text-xl font-bold text-white">{user?.displayName}</h3>
                        <p className="text-zinc-400">@{user?.handle}</p>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">E-posta</label>
                        <div className="px-4 py-3 rounded-lg bg-white/5 text-zinc-300 border border-white/10">
                            {user?.email}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Görünen Ad</label>
                        <input
                            type="text"
                            defaultValue={user?.displayName}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                        <textarea
                            defaultValue={user?.bio || ''}
                            placeholder="Kendiniz hakkında bir şeyler yazın..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                        />
                    </div>
                </div>

                <button className="mt-4 px-6 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20">
                    Değişiklikleri Kaydet
                </button>
            </SettingsCard>

            {/* Danger Zone */}
            <SettingsCard danger title="Tehlikeli Bölge" icon="⚠️">
                <p className="text-zinc-400 text-sm mb-4">
                    Bu işlemler geri alınamaz. Lütfen dikkatli olun.
                </p>
                <button className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors">
                    Hesabı Sil
                </button>
            </SettingsCard>
        </div>
    );
}
