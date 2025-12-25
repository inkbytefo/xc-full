// ============================================================================
// Overlay Settings Modal - Complete Settings Panel with Keybinding Editor
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
    useOverlaySettings,
    keyEventToBinding,
    type KeyBinding
} from './stores/overlaySettingsStore';

// SVG Icons
const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const KeyboardIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5m-9 5v6" />
    </svg>
);

const SettingsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const VolumeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const PaletteIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsTab = 'keybindings' | 'appearance' | 'voice' | 'general';

// Keybinding Editor Component
function KeybindingEditor({
    label,
    description,
    binding,
    onSave
}: {
    label: string;
    description?: string;
    binding: KeyBinding;
    onSave: (binding: KeyBinding) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempBinding, setTempBinding] = useState<KeyBinding | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const newBinding = keyEventToBinding(e);
        if (newBinding) {
            setTempBinding(newBinding);
        }
    }, []);

    useEffect(() => {
        if (isEditing) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isEditing, handleKeyDown]);

    const handleSave = () => {
        if (tempBinding) {
            onSave(tempBinding);
        }
        setIsEditing(false);
        setTempBinding(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setTempBinding(null);
    };

    return (
        <div style={{
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 10,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background 0.2s ease',
            border: '1px solid rgba(255,255,255,0.05)'
        }}
            className="hover:bg-white/5"
        >
            <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                    {label}
                </div>
                {description && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {description}
                    </div>
                )}
            </div>

            {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        padding: '8px 16px',
                        background: 'rgba(124, 58, 237, 0.2)',
                        border: '1px solid rgba(124, 58, 237, 0.5)',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#a78bfa',
                        minWidth: 100,
                        textAlign: 'center',
                        animation: 'pulse 1.5s infinite'
                    }}>
                        {tempBinding ? tempBinding.display : 'Tuşa basın...'}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!tempBinding}
                        className="overlay-btn-primary"
                        style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 12,
                            cursor: tempBinding ? 'pointer' : 'not-allowed',
                            border: 'none'
                        }}
                    >
                        ✓
                    </button>
                    <button
                        onClick={handleCancel}
                        className="overlay-btn"
                        style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderColor: 'transparent',
                            borderRadius: 6,
                            color: '#f87171',
                            fontSize: 12,
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    className="overlay-btn"
                    style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.8)',
                    }}
                >
                    {binding.display}
                </button>
            )}
        </div>
    );
}

// Toggle Switch Component
function Toggle({ checked, onChange, disabled = false }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`overlay-btn ${checked ? 'checked' : ''}`}
            style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: checked ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative',
                opacity: disabled ? 0.5 : 1,
                padding: 0
            }}
        >
            <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: checked ? 23 : 3,
                transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
        </button>
    );
}

// Slider Component
function Slider({ value, onChange, min = 0, max = 1, step = 0.05 }: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) {
    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(value - min) / (max - min) * 100}%, rgba(255,255,255,0.1) ${(value - min) / (max - min) * 100}%, rgba(255,255,255,0.1) 100%)`,
                appearance: 'none',
                cursor: 'pointer'
            }}
        />
    );
}

export function OverlaySettingsModal({ isOpen, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('keybindings');
    const settings = useOverlaySettings();

    if (!isOpen) return null;

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'keybindings', label: 'Tuş Atamaları', icon: <KeyboardIcon className="w-4 h-4" /> },
        { id: 'appearance', label: 'Görünüm', icon: <PaletteIcon className="w-4 h-4" /> },
        { id: 'voice', label: 'Ses', icon: <VolumeIcon className="w-4 h-4" /> },
        { id: 'general', label: 'Genel', icon: <SettingsIcon className="w-4 h-4" /> },
    ];

    return (
        <div
            className="modal-backdrop"
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
                zIndex: 1000
            }}>
            {/* Modal Container */}
            <div
                className="glass modal-content"
                style={{
                    width: '90%',
                    maxWidth: 720,
                    maxHeight: '80vh',
                    borderRadius: 20,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 20px rgba(124, 58, 237, 0.3)'
                        }}>
                            <SettingsIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Overlay Ayarları</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Tuş atamaları ve tercihler</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="overlay-btn"
                        style={{
                            padding: 8,
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            color: 'rgba(255,255,255,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <div style={{
                        width: 180,
                        padding: '16px 12px',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`overlay-btn ${activeTab === tab.id ? 'active' : ''}`}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: 4,
                                    background: activeTab === tab.id ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeTab === tab.id ? 'rgba(124, 58, 237, 0.3)' : 'transparent',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    color: activeTab === tab.id ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
                                    fontSize: 13,
                                    fontWeight: activeTab === tab.id ? 500 : 400,
                                    textAlign: 'left'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                        {/* Keybindings Tab */}
                        {activeTab === 'keybindings' && (
                            <div className="tooltip">
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
                                    Overlay Tuş Atamaları
                                </h3>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                                    Overlay'i açmak ve kontrol etmek için tuş kombinasyonlarını özelleştirin.
                                    Değişiklikler anında uygulanır.
                                </p>

                                <KeybindingEditor
                                    label="Overlay Aç/Kapat"
                                    description="Overlay'i göster veya gizle"
                                    binding={settings.keybindings.toggleOverlay}
                                    onSave={(binding) => settings.setKeybinding('toggleOverlay', binding)}
                                />

                                <div style={{
                                    marginTop: 24,
                                    padding: 16,
                                    background: 'rgba(234, 179, 8, 0.1)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(234, 179, 8, 0.2)'
                                }}>
                                    <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, marginBottom: 4 }}>
                                        ⚠️ Not
                                    </div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                        Tuş ataması değişiklikleri uygulamanın yeniden başlatılmasını gerektirebilir.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Appearance Tab */}
                        {activeTab === 'appearance' && (
                            <div className="tooltip">
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
                                    Görünüm Ayarları
                                </h3>

                                <div style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 12,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                                Overlay Opaklığı
                                            </div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                                {Math.round(settings.overlayOpacity * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                    <Slider
                                        value={settings.overlayOpacity}
                                        onChange={settings.setOverlayOpacity}
                                        min={0.3}
                                        max={1}
                                        step={0.05}
                                    />
                                </div>

                                <div style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 12,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                                Arka Plan Opaklığı
                                            </div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                                Ana ekran arka plan koyuluğu ({Math.round(settings.overlayBackdropOpacity * 100)}%)
                                            </div>
                                        </div>
                                    </div>
                                    <Slider
                                        value={settings.overlayBackdropOpacity}
                                        onChange={settings.setOverlayBackdropOpacity}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                    />
                                </div>

                                <div style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 12,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                                İğnelenmiş Widget Opaklığı
                                            </div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                                Ghost modunda widget zemin görünürlüğü ({Math.round(settings.pinnedWidgetOpacity * 100)}%)
                                            </div>
                                        </div>
                                    </div>
                                    <Slider
                                        value={settings.pinnedWidgetOpacity}
                                        onChange={settings.setPinnedWidgetOpacity}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                    />
                                </div>

                                <div style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 12,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                                Bulanıklık Efekti
                                            </div>
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                                Arka plan bulanıklık şiddeti ({settings.blurStrength}px)
                                            </div>
                                        </div>
                                    </div>
                                    <Slider
                                        value={settings.blurStrength}
                                        onChange={settings.setBlurStrength}
                                        min={0}
                                        max={20}
                                        step={1}
                                    />
                                </div>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                            Widget Animasyonları
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            Açılma ve geçiş animasyonları
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={settings.widgetAnimations}
                                        onChange={settings.setWidgetAnimations}
                                    />
                                </div>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                            Kompakt Mod
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            Daha küçük widget boyutları
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={settings.compactMode}
                                        onChange={settings.setCompactMode}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Voice Tab */}
                        {activeTab === 'voice' && (
                            <div className="tooltip">
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
                                    Ses Ayarları
                                </h3>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                            Bas-Konuş (Push to Talk)
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            Mikrofonu sadece tuşa basınca aktif et
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={settings.pushToTalk}
                                        onChange={settings.setPushToTalk}
                                    />
                                </div>

                                {settings.pushToTalk && (
                                    <KeybindingEditor
                                        label="Push to Talk Tuşu"
                                        description="Konuşmak için basılı tutulacak tuş"
                                        binding={settings.pushToTalkKey}
                                        onSave={settings.setPushToTalkKey}
                                    />
                                )}
                            </div>
                        )}

                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="tooltip">
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
                                    Genel Ayarlar
                                </h3>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                            Yardım İpuçlarını Göster
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            Alt bilgi çubuğunda tuş bilgilerini göster
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={settings.showHints}
                                        onChange={settings.setShowHints}
                                    />
                                </div>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                            Widget Konumlarını Hatırla
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            Pinned widget pozisyonlarını kaydet
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={settings.rememberWidgetPositions}
                                        onChange={settings.setRememberWidgetPositions}
                                    />
                                </div>

                                <div style={{
                                    padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                                            Oyun Algılandığında Gizle
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            Oyun başlatılınca otomatik gizle
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={settings.autoHideOnGame}
                                        onChange={settings.setAutoHideOnGame}
                                    />
                                </div>

                                /* Reset Button */
                                <button
                                    onClick={settings.resetToDefaults}
                                    className="overlay-btn"
                                    style={{
                                        marginTop: 24,
                                        padding: '12px 20px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: 10,
                                        color: '#f87171',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Varsayılanlara Sıfırla
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
