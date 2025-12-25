// ============================================================================
// Voice Widget - Overlay Ses Kontrol Paneli
// ============================================================================

import { useVoiceStore } from '../../../store/voiceStore';
import { BaseWidget } from './BaseWidget';
import { useOverlayMode } from '../hooks/useOverlayMode';
import {
    HeadphonesIcon,
    HeadphonesOffIcon,
    MicIcon,
    MicOffIcon,
    PhoneOffIcon,
    ScreenShareIcon,
    VideoIcon,
    VideoOffIcon,
    VolumeIcon
} from '../../servers/components/Icons';
import { ControlButton } from '../../servers/components/ControlButton';

export function VoiceWidget() {
    const { pinnedView } = useOverlayMode();
    const {
        isConnected,
        isConnecting,
        isMuted,
        isDeafened,
        isCameraOn,
        isScreenSharing,
        toggleMute,
        toggleDeafen,
        toggleCamera,
        toggleScreenShare,
        disconnect,
        participants,
        activeChannel,
        error,
        ownerAvailable
    } = useVoiceStore();

    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
        if (a.isMuted !== b.isMuted) return a.isMuted ? 1 : -1;
        if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
        return a.identity.localeCompare(b.identity);
    });
    const controlsDisabled = !ownerAvailable || (!isConnected && !isConnecting);
    const supportsVideo = activeChannel?.type === "video";

    return (
        <BaseWidget
            id="voice"
            title="Ses Kontrol"
            icon="🔊"
            defaultPosition={{ x: 100, y: 550 }}
            defaultSize={{ width: 320, height: 280 }}
        >
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 ${isConnected ? "bg-green-500/15 text-green-400" : "bg-white/5 text-zinc-400"
                        }`}
                >
                    <VolumeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    {isConnected && activeChannel ? (
                        <>
                            <div className="text-sm font-semibold text-green-300 truncate">
                                {activeChannel.name}
                            </div>
                            <div className="text-xs text-zinc-400">
                                {isConnecting ? "Bağlanıyor" : "Ses Bağlantısı"} • {participants.length} kişi
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-sm font-medium text-zinc-200">
                                Bağlı Değil
                            </div>
                            <div className="text-xs text-zinc-500">
                                {ownerAvailable ? "Bir ses kanalına katılın" : "Ana uygulama aktif değil"}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="px-4 py-2 text-xs text-red-300 border-b border-white/10 bg-red-500/10">
                    {error}
                </div>
            )}

            {isConnected && sortedParticipants.length > 0 && !pinnedView && (
                <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-white/10">
                    {sortedParticipants.slice(0, 8).map((p) => (
                        <div
                            key={p.sid}
                            title={p.identity + (p.isLocal ? " (Sen)" : "")}
                            className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white border border-white/10 ${p.isSpeaking
                                ? "bg-green-500/30 ring-2 ring-green-400/40 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                                : "bg-gradient-to-br from-indigo-500 to-purple-600"
                                }`}
                        >
                            {p.identity[0]?.toUpperCase() || "?"}
                            {p.isMuted && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border-2 border-black/50">
                                    <MicOffIcon className="w-2.5 h-2.5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {sortedParticipants.length > 8 && (
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-zinc-300">
                            +{sortedParticipants.length - 8}
                        </div>
                    )}
                </div>
            )}

            {isConnected && sortedParticipants.length > 0 && pinnedView && (
                <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-zinc-200 truncate">
                            {activeChannel?.name ?? "Ses Kanalı"}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                            {sortedParticipants.length}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {sortedParticipants.slice(0, 12).map((p) => (
                            <div
                                key={p.sid}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${p.isSpeaking
                                    ? "bg-green-500/10 border-green-500/25"
                                    : "bg-black/10 border-white/10"
                                    }`}
                            >
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.isSpeaking
                                        ? "bg-green-500/40 ring-2 ring-green-400/30"
                                        : "bg-gradient-to-br from-indigo-500 to-purple-600"
                                        }`}
                                >
                                    {p.identity[0]?.toUpperCase() || "?"}
                                </div>
                                <div className="flex-1 min-w-0 text-xs font-semibold text-zinc-100 truncate">
                                    {p.identity}{p.isLocal ? " (Sen)" : ""}
                                </div>
                                {p.isMuted && (
                                    <div className="text-red-300">
                                        <MicOffIcon className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {sortedParticipants.length > 12 && (
                            <div className="text-[11px] text-zinc-400 px-2 pt-1">
                                +{sortedParticipants.length - 12} kişi daha
                            </div>
                        )}
                    </div>

                    <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-zinc-300">
                        <div className={`flex items-center gap-1.5 ${isMuted ? "text-red-300" : "text-zinc-300"}`}>
                            {isMuted ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                            {isMuted ? "Sessiz" : "Açık"}
                        </div>
                        <div className={`flex items-center gap-1.5 ${isDeafened ? "text-red-300" : "text-zinc-300"}`}>
                            {isDeafened ? <HeadphonesOffIcon className="w-4 h-4" /> : <HeadphonesIcon className="w-4 h-4" />}
                            {isDeafened ? "Kapalı" : "Açık"}
                        </div>
                        {supportsVideo && (
                            <>
                                <div className={`flex items-center gap-1.5 ${!isCameraOn ? "text-red-300" : "text-zinc-300"}`}>
                                    {!isCameraOn ? <VideoOffIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
                                    {isCameraOn ? "Kamera" : "Kapalı"}
                                </div>
                                <div className={`flex items-center gap-1.5 ${isScreenSharing ? "text-green-300" : "text-zinc-300"}`}>
                                    <ScreenShareIcon className="w-4 h-4" />
                                    {isScreenSharing ? "Ekran" : "Yok"}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {!pinnedView && (
                <div className="p-4 flex items-center justify-center gap-3">
                    <div className={controlsDisabled ? "opacity-50 pointer-events-none" : ""}>
                        <ControlButton
                            icon={MicIcon}
                            activeIcon={MicOffIcon}
                            isActive={isMuted}
                            danger={isMuted}
                            label={isMuted ? "Mikrofonu Aç" : "Sessiz"}
                            onClick={() => {
                                void toggleMute();
                            }}
                            className="!rounded-xl !p-3"
                        />
                    </div>

                    <div className={controlsDisabled ? "opacity-50 pointer-events-none" : ""}>
                        <ControlButton
                            icon={HeadphonesIcon}
                            activeIcon={HeadphonesOffIcon}
                            isActive={isDeafened}
                            danger={isDeafened}
                            label={isDeafened ? "Sesi Aç" : "Kulaklık"}
                            onClick={toggleDeafen}
                            className="!rounded-xl !p-3"
                        />
                    </div>

                    {supportsVideo && (
                        <>
                            <div className={controlsDisabled ? "opacity-50 pointer-events-none" : ""}>
                                <ControlButton
                                    icon={VideoIcon}
                                    activeIcon={VideoOffIcon}
                                    isActive={!isCameraOn}
                                    danger={!isCameraOn}
                                    label={isCameraOn ? "Kamerayı Kapat" : "Kamera Aç"}
                                    onClick={() => {
                                        void toggleCamera();
                                    }}
                                    className="!rounded-xl !p-3"
                                />
                            </div>
                            <div className={controlsDisabled ? "opacity-50 pointer-events-none" : ""}>
                                <ControlButton
                                    icon={ScreenShareIcon}
                                    isActive={isScreenSharing}
                                    label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                                    onClick={() => {
                                        void toggleScreenShare();
                                    }}
                                    className="!rounded-xl !p-3"
                                />
                            </div>
                        </>
                    )}

                    {isConnected && (
                        <>
                            <div className="w-px h-8 bg-white/10" />
                            <ControlButton
                                icon={PhoneOffIcon}
                                isActive
                                danger
                                label="Bağlantıyı Kes"
                                onClick={disconnect}
                                className="!rounded-xl !p-3"
                            />
                        </>
                    )}
                </div>
            )}

            {!isConnected && (
                <div className="px-4 pb-4 text-center text-xs text-zinc-500">
                    Ses kontrollerini kullanmak için bir sunucudan ses kanalına katılın
                </div>
            )}
        </BaseWidget>
    );
}
