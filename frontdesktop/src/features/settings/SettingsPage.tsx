// ============================================================================
// Settings Page - Main Layout
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  AccountSettings,
  AppearanceSettings,
  AudioSettings,
  NotificationSettings,
  PrivacySettings,
  AboutSettings,
} from './components';

type SettingsTab = 'account' | 'appearance' | 'audio' | 'notifications' | 'privacy' | 'about';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'account', label: 'Hesap', icon: '👤' },
  { id: 'appearance', label: 'Görünüm', icon: '🎨' },
  { id: 'audio', label: 'Ses', icon: '🎙️' },
  { id: 'notifications', label: 'Bildirimler', icon: '🔔' },
  { id: 'privacy', label: 'Gizlilik', icon: '🔒' },
  { id: 'about', label: 'Hakkında', icon: 'ℹ️' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'audio':
        return <AudioSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'about':
        return <AboutSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#050505]/60 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col shrink-0">
        <h1 className="text-xl font-bold text-white mb-6 px-2">Ayarlar</h1>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                                w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 
                                transition-all duration-200
                                ${activeTab === tab.id
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }
                            `}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-3 font-medium shrink-0"
        >
          <span className="text-lg">🚪</span>
          <span>Çıkış Yap</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto scrollbar-none">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
