// ============================================================================
// VoiceSettings - Audio Device Configuration (Migrated to mediaSession)
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUIStore } from "../../../store/uiStore";

type AudioDeviceKind = "audioinput" | "audiooutput";

interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

function supportsEnumerateDevices(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.enumerateDevices;
}

function supportsAudioOutputSelection(): boolean {
  const el = typeof document !== "undefined" ? document.createElement("audio") : null;
  return !!el && typeof (el as unknown as { setSinkId?: (id: string) => Promise<void> }).setSinkId === "function";
}

function formatDeviceLabel(kind: AudioDeviceKind, label: string | undefined, idx: number): string {
  if (label && label.trim().length) return label;
  return kind === "audioinput" ? `Mikrofon ${idx + 1}` : `Hoparlör ${idx + 1}`;
}

async function listAudioDevices(): Promise<{
  audioInputs: MediaDeviceOption[];
  audioOutputs: MediaDeviceOption[];
}> {
  if (!supportsEnumerateDevices()) return { audioInputs: [], audioOutputs: [] };
  const devices = await navigator.mediaDevices.enumerateDevices();

  const audioInputsRaw = devices.filter((d) => d.kind === "audioinput");
  const audioOutputsRaw = devices.filter((d) => d.kind === "audiooutput");

  return {
    audioInputs: audioInputsRaw.map((d, idx) => ({
      deviceId: d.deviceId,
      label: formatDeviceLabel("audioinput", d.label, idx),
    })),
    audioOutputs: audioOutputsRaw.map((d, idx) => ({
      deviceId: d.deviceId,
      label: formatDeviceLabel("audiooutput", d.label, idx),
    })),
  };
}

async function requestAudioPermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
}

export function AudioDeviceSettings({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "overlay";
}) {
  const audioInputDeviceId = useUIStore((s) => s.audioInputDeviceId);
  const audioOutputDeviceId = useUIStore((s) => s.audioOutputDeviceId);
  const setAudioInputDeviceId = useUIStore((s) => s.setAudioInputDeviceId);
  const setAudioOutputDeviceId = useUIStore((s) => s.setAudioOutputDeviceId);
  // Note: Audio device application to LiveKit happens via media-session hooks

  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const canSelectOutput = useMemo(() => supportsAudioOutputSelection(), []);
  const showPermissionHint = useMemo(() => {
    if (!audioInputs.length) return false;
    const anyEmptyLabel = audioInputs.some((d) => d.label.startsWith("Mikrofon "));
    return anyEmptyLabel;
  }, [audioInputs]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { audioInputs: ins, audioOutputs: outs } = await listAudioDevices();
      setAudioInputs(ins);
      setAudioOutputs(outs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handler = () => void refresh();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [refresh]);

  const handleRequestPermission = useCallback(async () => {
    setPermissionError(null);
    try {
      await requestAudioPermission();
      await refresh();
    } catch (e) {
      setPermissionError(e instanceof Error ? e.message : "Mikrofon izni alınamadı.");
    }
  }, [refresh]);

  const containerClassName =
    variant === "overlay"
      ? "rounded-xl border border-white/10 bg-white/5 p-4"
      : "rounded-xl border border-white/10 bg-[#050505]/60 backdrop-blur-md p-6";

  const selectClassName =
    "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-[color:var(--velvet-2)] transition-colors appearance-none cursor-pointer";

  return (
    <div className={[containerClassName, className].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">Ses Cihazları</div>
          <div className="text-xs text-zinc-500 mt-1">
            Değişiklikler kaydedilir ve destekleniyorsa anında uygulanır.
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors disabled:opacity-50"
        >
          Yenile
        </button>
      </div>

      {permissionError && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {permissionError}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-zinc-200">Giriş (Mikrofon)</div>
          <select
            value={audioInputDeviceId ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setAudioInputDeviceId(value);
            }}
            className={selectClassName}
            disabled={!supportsEnumerateDevices()}
          >
            <option value="" className="bg-[#1a1a20]">
              Varsayılan
            </option>
            {audioInputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId} className="bg-[#1a1a20]">
                {d.label}
              </option>
            ))}
          </select>

          {showPermissionHint && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">
                Cihaz isimleri için mikrofon izni gerekebilir.
              </div>
              <button
                type="button"
                onClick={() => void handleRequestPermission()}
                className="px-3 py-1.5 rounded-lg bg-[color:var(--velvet)]/20 hover:bg-[color:var(--velvet)]/30 border border-[color:var(--velvet)]/30 text-xs font-semibold text-[color:var(--velvet-2)] transition-colors"
              >
                İzin Ver
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-zinc-200">Çıkış (Hoparlör)</div>
          <select
            value={audioOutputDeviceId ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setAudioOutputDeviceId(value);
            }}
            className={selectClassName}
            disabled={!supportsEnumerateDevices() || !canSelectOutput}
          >
            <option value="" className="bg-[#1a1a20]">
              Varsayılan
            </option>
            {audioOutputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId} className="bg-[#1a1a20]">
                {d.label}
              </option>
            ))}
          </select>
          {!canSelectOutput && (
            <div className="text-xs text-zinc-500">
              Bu ortamda çıkış cihazı seçimi desteklenmiyor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VoiceSettings() {
  return <AudioDeviceSettings />;
}
