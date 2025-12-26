import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AudioDeviceSettings } from "../voice/components/VoiceSettings";
import { keyEventToBinding, type KeyBinding, useOverlaySettings } from "./stores/overlaySettingsStore";

const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const KeyboardIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5m-9 5v6"
    />
  </svg>
);

const SettingsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const VolumeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

const PaletteIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
    />
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "keybindings" | "appearance" | "voice" | "general";

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={["rounded-xl border border-white/10 bg-white/5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

function KeybindingEditor({
  label,
  description,
  binding,
  onSave,
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
    if (newBinding) setTempBinding(newBinding);
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, isEditing]);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 mt-1">{description}</div>}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-2 rounded-lg border border-[color:var(--velvet-2)]/40 bg-[color:var(--velvet)]/15 text-xs font-semibold text-[color:var(--velvet-2)] min-w-32 text-center animate-pulse">
            {tempBinding ? tempBinding.display : "Tuşa basın..."}
          </div>
          <button
            type="button"
            onClick={() => {
              if (tempBinding) onSave(tempBinding);
              setIsEditing(false);
              setTempBinding(null);
            }}
            disabled={!tempBinding}
            className="h-9 px-3 rounded-lg bg-[color:var(--velvet)] hover:bg-[color:var(--velvet-2)] text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setTempBinding(null);
            }}
            className="h-9 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold border border-red-500/30 transition-colors"
          >
            İptal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-zinc-200 transition-colors"
        >
          {binding.display}
        </button>
      )}
    </div>
  );
}

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
    <button
      type="button"
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
      className={[
        "relative w-11 h-6 rounded-full border transition-colors",
        checked ? "bg-[color:var(--velvet)]/80 border-[color:var(--velvet-2)]/50" : "bg-white/10 border-white/10",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <div
        className={[
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5 left-0.5" : "translate-x-0 left-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10"
      style={{
        background: `linear-gradient(to right, var(--velvet-2) 0%, var(--velvet-2) ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.12) 100%)`,
      }}
    />
  );
}

export function OverlaySettingsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("keybindings");
  const settings = useOverlaySettings();

  if (!isOpen) return null;

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: "keybindings", label: "Tuş Atamaları", icon: <KeyboardIcon className="w-4 h-4" /> },
    { id: "appearance", label: "Görünüm", icon: <PaletteIcon className="w-4 h-4" /> },
    { id: "voice", label: "Ses", icon: <VolumeIcon className="w-4 h-4" /> },
    { id: "general", label: "Genel", icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-[760px] max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--bg-elevated)] backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[color:var(--velvet)] to-[color:var(--velvet-2)] shadow-[0_10px_30px_rgba(148,70,91,0.25)] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-100">Overlay Ayarları</div>
              <div className="text-xs text-zinc-500 mt-0.5">Tuş atamaları ve tercihler</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center transition-colors"
            aria-label="Kapat"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(80vh-84px)]">
          <div className="w-56 shrink-0 border-r border-white/10 bg-black/10 p-3">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors",
                    active
                      ? "bg-[color:var(--velvet)]/15 border-[color:var(--velvet-2)]/25 text-[color:var(--velvet-2)]"
                      : "bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                  ].join(" ")}
                >
                  <span className={active ? "text-[color:var(--velvet-2)]" : "text-zinc-500"}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === "keybindings" && (
              <div>
                <div className="text-base font-bold text-zinc-100">Overlay Tuş Atamaları</div>
                <div className="text-sm text-zinc-500 mt-1">
                  Overlay&apos;i açmak ve kontrol etmek için tuş kombinasyonlarını özelleştirin.
                </div>

                <div className="mt-5 space-y-3">
                  <KeybindingEditor
                    label="Overlay Aç/Kapat"
                    description="Overlay'i göster veya gizle"
                    binding={settings.keybindings.toggleOverlay}
                    onSave={(binding) => settings.setKeybinding("toggleOverlay", binding)}
                  />
                  <KeybindingEditor
                    label="Ghost Mode Aç/Kapat"
                    description="Overlay açıkken tıklanamaz moda geçiş"
                    binding={settings.keybindings.toggleGhostMode}
                    onSave={(binding) => settings.setKeybinding("toggleGhostMode", binding)}
                  />
                </div>

                {/* Quick Chat Section */}
                <div className="mt-8">
                  <div className="text-base font-bold text-zinc-100">Hızlı Mesaj</div>
                  <div className="text-sm text-zinc-500 mt-1">
                    Ghost modda oyun oynarken hızlıca mesaj gönderin.
                  </div>

                  <div className="mt-4 space-y-3">
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">Hızlı Mesaj Özelliği</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Ghost modda tuşa basarak mesaj yazın</div>
                        </div>
                        <Toggle checked={settings.quickChatEnabled} onChange={settings.setQuickChatEnabled} />
                      </div>
                    </Card>

                    {settings.quickChatEnabled && (
                      <KeybindingEditor
                        label="Hızlı Mesaj Tuşu"
                        description="Ghost modda mesaj yazmak için basın"
                        binding={settings.keybindings.quickChat}
                        onSave={(binding) => settings.setKeybinding("quickChat", binding)}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-5 px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200 text-sm">
                  Tuş ataması değişiklikleri bazı durumlarda uygulamanın yeniden başlatılmasını gerektirebilir.
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div>
                  <div className="text-base font-bold text-zinc-100">Görünüm</div>
                  <div className="text-sm text-zinc-500 mt-1">Overlay&apos;in opaklık ve animasyon tercihleri.</div>
                </div>

                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Overlay Opaklığı</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{Math.round(settings.overlayOpacity * 100)}%</div>
                    </div>
                  </div>
                  <Slider value={settings.overlayOpacity} onChange={settings.setOverlayOpacity} min={0.3} max={1} step={0.05} />
                </Card>

                <Card className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">Arka Plan Opaklığı</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {Math.round(settings.overlayBackdropOpacity * 100)}%
                    </div>
                  </div>
                  <Slider
                    value={settings.overlayBackdropOpacity}
                    onChange={settings.setOverlayBackdropOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Card>

                <Card className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">İğnelenmiş Widget Opaklığı</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{Math.round(settings.pinnedWidgetOpacity * 100)}%</div>
                  </div>
                  <Slider value={settings.pinnedWidgetOpacity} onChange={settings.setPinnedWidgetOpacity} min={0} max={1} step={0.05} />
                </Card>

                <Card className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">Bulanıklık</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{settings.blurStrength}px</div>
                  </div>
                  <Slider value={settings.blurStrength} onChange={settings.setBlurStrength} min={0} max={20} step={1} />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Widget Animasyonları</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Açılma ve geçiş animasyonları</div>
                    </div>
                    <Toggle checked={settings.widgetAnimations} onChange={settings.setWidgetAnimations} />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Kompakt Mod</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Daha küçük widget boyutları</div>
                    </div>
                    <Toggle checked={settings.compactMode} onChange={settings.setCompactMode} />
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "voice" && (
              <div className="space-y-4">
                <div>
                  <div className="text-base font-bold text-zinc-100">Ses</div>
                  <div className="text-sm text-zinc-500 mt-1">Konuşma davranışı ve cihaz seçimleri.</div>
                </div>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Bas-Konuş</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Mikrofonu sadece tuşa basınca aktif et</div>
                    </div>
                    <Toggle checked={settings.pushToTalk} onChange={settings.setPushToTalk} />
                  </div>
                </Card>

                {settings.pushToTalk && (
                  <KeybindingEditor
                    label="Push to Talk Tuşu"
                    description="Konuşmak için basılı tutulacak tuş"
                    binding={settings.pushToTalkKey}
                    onSave={settings.setPushToTalkKey}
                  />
                )}

                <AudioDeviceSettings variant="overlay" />
              </div>
            )}

            {activeTab === "general" && (
              <div className="space-y-4">
                <div>
                  <div className="text-base font-bold text-zinc-100">Genel</div>
                  <div className="text-sm text-zinc-500 mt-1">Overlay davranışları ve hatırlama seçenekleri.</div>
                </div>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Yardım İpuçlarını Göster</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Alt bilgi çubuğunda tuş bilgilerini göster</div>
                    </div>
                    <Toggle checked={settings.showHints} onChange={settings.setShowHints} />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Widget Konumlarını Hatırla</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Pinned widget pozisyonlarını kaydet</div>
                    </div>
                    <Toggle checked={settings.rememberWidgetPositions} onChange={settings.setRememberWidgetPositions} />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Oyun Algılandığında Gizle</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Oyun başlatılınca otomatik gizle</div>
                    </div>
                    <Toggle checked={settings.autoHideOnGame} onChange={settings.setAutoHideOnGame} />
                  </div>
                </Card>

                <button
                  type="button"
                  onClick={settings.resetToDefaults}
                  className="mt-2 w-full h-11 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/15 text-red-200 font-semibold transition-colors"
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
