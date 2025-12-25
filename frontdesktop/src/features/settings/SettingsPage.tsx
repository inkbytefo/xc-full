import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import {
  getPrivacySettings,
  updatePrivacySettings,
  onlineStatusOptions,
  dmPermissionOptions,
  profileVisibilityOptions,
  friendRequestOptions,
  type PrivacySettings,
} from "./privacyApi";

type SettingsTab = "account" | "appearance" | "notifications" | "privacy" | "about";

// Toggle switch component
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
    </label>
  );
}

// Select component for dropdown options
function SelectOption({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-white">{label}</div>
          {description && <div className="text-sm text-zinc-500">{description}</div>}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a20]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { backgroundTheme, setBackgroundTheme } = useUIStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Privacy state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Load privacy settings when tab is activated
  useEffect(() => {
    if (activeTab === "privacy" && !privacySettings) {
      loadPrivacySettings();
    }
  }, [activeTab]);

  const loadPrivacySettings = useCallback(async () => {
    setPrivacyLoading(true);
    setPrivacyError(null);
    try {
      const settings = await getPrivacySettings();
      setPrivacySettings(settings);
    } catch (e) {
      setPrivacyError(e instanceof Error ? e.message : "Gizlilik ayarları yüklenemedi");
    } finally {
      setPrivacyLoading(false);
    }
  }, []);

  const updatePrivacy = useCallback(async (updates: Partial<PrivacySettings>) => {
    if (!privacySettings) return;

    setPrivacySaving(true);
    try {
      const updated = await updatePrivacySettings(updates);
      setPrivacySettings(updated);
    } catch (e) {
      setPrivacyError(e instanceof Error ? e.message : "Ayarlar güncellenemedi");
    } finally {
      setPrivacySaving(false);
    }
  }, [privacySettings]);

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "account", label: "Hesap", icon: "👤" },
    { id: "appearance", label: "Görünüm", icon: "🎨" },
    { id: "notifications", label: "Bildirimler", icon: "🔔" },
    { id: "privacy", label: "Gizlilik", icon: "🔒" },
    { id: "about", label: "Hakkında", icon: "ℹ️" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#050505]/60 backdrop-blur-md border-r border-white/10 p-4 flex flex-col">
        <h1 className="text-xl font-bold text-white mb-6">Ayarlar</h1>

        <nav className="flex-1 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors ${activeTab === tab.id
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-3 font-medium"
        >
          <span className="text-lg">🚪</span>
          <span>Çıkış Yap</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "account" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Hesap Ayarları</h2>

            {/* Profile Card */}
            <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-20 h-20 rounded-full"
                  style={{
                    backgroundImage: user?.avatarGradient
                      ? `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`
                      : "linear-gradient(135deg, #333, #666)",
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
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                  <textarea
                    defaultValue={user?.bio || ""}
                    placeholder="Kendiniz hakkında bir şeyler yazın..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <button className="mt-4 px-6 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors">
                Değişiklikleri Kaydet
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-bold text-red-400 mb-2">Tehlikeli Bölge</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Bu işlemler geri alınamaz. Lütfen dikkatli olun.
              </p>
              <button className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors">
                Hesabı Sil
              </button>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Görünüm</h2>

            <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="font-medium text-white mb-4">Tema</h3>
              <div className="flex gap-3">
                <button className="flex-1 p-4 rounded-lg bg-[#0a0a0f]/80 border-2 border-purple-500 text-center">
                  <div className="text-2xl mb-2">🌙</div>
                  <div className="text-white font-medium">Karanlık</div>
                </button>
                <button className="flex-1 p-4 rounded-lg bg-white/10 border border-white/20 text-center opacity-50">
                  <div className="text-2xl mb-2">☀️</div>
                  <div className="text-zinc-400 font-medium">Aydınlık</div>
                  <div className="text-xs text-zinc-500 mt-1">Yakında</div>
                </button>
              </div>
            </div>

            <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10 mt-6">
              <h3 className="font-medium text-white mb-4">Arkaplan Teması</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setBackgroundTheme("dotwave")}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${backgroundTheme === "dotwave"
                    ? "bg-purple-500/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                >
                  <div className="text-2xl mb-2">🌊</div>
                  <div className="text-white font-medium">DotWave</div>
                  <div className="text-xs text-zinc-500 mt-1">Dinamik parçacık ağı</div>
                </button>

                <button
                  onClick={() => setBackgroundTheme("topo")}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${backgroundTheme === "topo"
                    ? "bg-purple-500/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                >
                  <div className="text-2xl mb-2">🏔️</div>
                  <div className="text-white font-medium">Topo</div>
                  <div className="text-xs text-zinc-500 mt-1">Topografik isoline akışı</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Bildirim Ayarları</h2>

            <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10 space-y-4">
              {[
                { id: "likes", label: "Beğeniler", desc: "Birisi gönderini beğendiğinde" },
                { id: "comments", label: "Yorumlar", desc: "Birisi gönderine yorum yaptığında" },
                { id: "follows", label: "Takipçiler", desc: "Birisi seni takip ettiğinde" },
                { id: "mentions", label: "Bahsetmeler", desc: "Birisi senden bahsettiğinde" },
                { id: "dm", label: "Direkt Mesajlar", desc: "Yeni mesaj aldığında" },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="text-sm text-zinc-500">{item.desc}</div>
                  </div>
                  <Toggle checked={true} onChange={() => { }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Gizlilik ve Güvenlik</h2>

            {privacyError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {privacyError}
              </div>
            )}

            {privacyLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
              </div>
            ) : privacySettings ? (
              <>
                {/* Visibility Settings */}
                <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">👁️</span>
                    Görünürlük Ayarları
                  </h3>

                  <SelectOption
                    label="Çevrimiçi Durumu"
                    description="Çevrimiçi olduğunuzu kimler görebilir"
                    value={privacySettings.onlineStatusVisibility}
                    options={onlineStatusOptions}
                    onChange={(value) => updatePrivacy({ onlineStatusVisibility: value as PrivacySettings["onlineStatusVisibility"] })}
                    disabled={privacySaving}
                  />

                  <SelectOption
                    label="Profil Görünürlüğü"
                    description="Profilinizi kimler görebilir"
                    value={privacySettings.profileVisibility}
                    options={profileVisibilityOptions}
                    onChange={(value) => updatePrivacy({ profileVisibility: value as PrivacySettings["profileVisibility"] })}
                    disabled={privacySaving}
                  />

                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <div>
                      <div className="font-medium text-white">Aktivite Durumu</div>
                      <div className="text-sm text-zinc-500">Ne oynadığınız/dinlediğiniz gösterilsin</div>
                    </div>
                    <Toggle
                      checked={privacySettings.showActivity}
                      onChange={(checked) => updatePrivacy({ showActivity: checked })}
                      disabled={privacySaving}
                    />
                  </div>
                </div>

                {/* Messaging Settings */}
                <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    Mesajlaşma Ayarları
                  </h3>

                  <SelectOption
                    label="Direkt Mesaj İzni"
                    description="Size kimler DM gönderebilir"
                    value={privacySettings.dmPermission}
                    options={dmPermissionOptions}
                    onChange={(value) => updatePrivacy({ dmPermission: value as PrivacySettings["dmPermission"] })}
                    disabled={privacySaving}
                  />

                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <div>
                      <div className="font-medium text-white">Okundu Bilgisi</div>
                      <div className="text-sm text-zinc-500">Mesajları okuduğunuzda gösterilsin</div>
                    </div>
                    <Toggle
                      checked={privacySettings.readReceiptsEnabled}
                      onChange={(checked) => updatePrivacy({ readReceiptsEnabled: checked })}
                      disabled={privacySaving}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium text-white">Yazıyor Göstergesi</div>
                      <div className="text-sm text-zinc-500">"Yazıyor..." durumunuz gösterilsin</div>
                    </div>
                    <Toggle
                      checked={privacySettings.typingIndicatorsEnabled}
                      onChange={(checked) => updatePrivacy({ typingIndicatorsEnabled: checked })}
                      disabled={privacySaving}
                    />
                  </div>
                </div>

                {/* Social Settings */}
                <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">🤝</span>
                    Sosyal Ayarlar
                  </h3>

                  <SelectOption
                    label="Arkadaşlık İstekleri"
                    description="Size kimler arkadaşlık isteği gönderebilir"
                    value={privacySettings.friendRequestPermission}
                    options={friendRequestOptions}
                    onChange={(value) => updatePrivacy({ friendRequestPermission: value as PrivacySettings["friendRequestPermission"] })}
                    disabled={privacySaving}
                  />
                </div>

                {/* Saving indicator */}
                {privacySaving && (
                  <div className="fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm flex items-center gap-2 shadow-lg">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Kaydediliyor...
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {activeTab === "about" && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Hakkında</h2>

            <div className="bg-[#050505]/60 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎮</div>
                <h3 className="text-2xl font-bold text-white">XCORD</h3>
                <p className="text-zinc-400">Versiyon 0.1.0</p>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-3 text-center text-zinc-400 text-sm">
                <p>© 2024 XCORD. Tüm hakları saklıdır.</p>
                <div className="flex justify-center gap-4">
                  <a href="#" className="text-purple-400 hover:text-purple-300">Gizlilik Politikası</a>
                  <a href="#" className="text-purple-400 hover:text-purple-300">Kullanım Şartları</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
