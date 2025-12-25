import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVoiceStore } from "../../../store/voiceStore";
import {
    MicIcon,
    MicOffIcon,
    HeadphonesIcon,
    HeadphonesOffIcon,
    VideoIcon,
    VideoOffIcon,
    ScreenShareIcon,
    PhoneOffIcon,
    ChevronDownIcon
} from "../../servers/components/Icons";
import { ControlButton } from "../../servers/components/ControlButton";

export function GlobalVoiceSessionModal() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        isConnected,
        isConnecting,
        connectionState,
        activeChannel,
        isMuted,
        isDeafened,
        isCameraOn,
        isScreenSharing,
        participants,
        toggleMute,
        toggleDeafen,
        toggleCamera,
        toggleScreenShare,
        disconnect
    } = useVoiceStore();

    const [isMinimized, setIsMinimized] = useState(false);

    if (!activeChannel) return null;
    if (!isConnected && !isConnecting) return null;
    if (/^\/servers\/[^/]+/.test(location.pathname)) return null;

    const handleReturnToChannel = () => {
        navigate(`/servers/${activeChannel.serverId}/channels/${activeChannel.id}`);
    };

    return (
        <div className={`fixed bottom-6 right-6 z-[9999] transition-all duration-500 ease-in-out ${isMinimized ? "w-12 h-12" : "w-80"
            }`}>
            {/* Main Modal Container */}
            <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl transition-all duration-500 ${isMinimized ? "h-12 w-12 rounded-full" : "h-auto"
                }`}>

                {/* Minimized Trigger */}
                {isMinimized ? (
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="w-full h-full flex items-center justify-center text-green-400 hover:bg-white/5 transition-colors"
                    >
                        <div className="relative">
                            <MicIcon className="w-6 h-6" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                        </div>
                    </button>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
                                    <MicIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100 truncate w-32">
                                        {activeChannel.name}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                        {connectionState === "connected"
                                            ? "Bağlı"
                                            : connectionState === "reconnecting"
                                                ? "Yeniden Bağlanıyor"
                                                : "Bağlanıyor"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors"
                            >
                                <ChevronDownIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Participants Preview */}
                        <div className="p-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {participants.map((p) => (
                                <div
                                    key={p.sid}
                                    className={`relative group h-10 w-10 rounded-full border-2 transition-all ${p.isSpeaking ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "border-white/10"
                                        }`}
                                >
                                    <div className="absolute inset-0 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-black uppercase text-white">
                                        {p.identity.charAt(0)}
                                    </div>
                                    {p.isMuted && (
                                        <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-zinc-900">
                                            <MicOffIcon className="w-2 h-2 text-white" />
                                        </div>
                                    )}

                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                        {p.identity} {p.isLocal && "(Sen)"}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="p-4 pt-2 flex items-center justify-between gap-2 border-t border-white/5 bg-white/5">
                            <div className="flex items-center gap-2">
                                <ControlButton
                                    icon={MicIcon}
                                    activeIcon={MicOffIcon}
                                    isActive={isMuted}
                                    danger={isMuted}
                                    label={isMuted ? "Sesi Aç" : "Sessiz"}
                                    onClick={toggleMute}
                                    className="!p-2"
                                />
                                <ControlButton
                                    icon={HeadphonesIcon}
                                    activeIcon={HeadphonesOffIcon}
                                    isActive={isDeafened}
                                    danger={isDeafened}
                                    label={isDeafened ? "Sesi Aç" : "Kulaklık"}
                                    onClick={toggleDeafen}
                                    className="!p-2"
                                />
                                <ControlButton
                                    icon={VideoIcon}
                                    activeIcon={VideoOffIcon}
                                    isActive={!isCameraOn}
                                    danger={!isCameraOn}
                                    label={isCameraOn ? "Kamerayı Kapat" : "Kamera Aç"}
                                    onClick={toggleCamera}
                                    className="!p-2"
                                />
                                <ControlButton
                                    icon={ScreenShareIcon}
                                    isActive={isScreenSharing}
                                    label={isScreenSharing ? "Bitir" : "Ekran"}
                                    onClick={toggleScreenShare}
                                    className="!p-2"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleReturnToChannel}
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 transition-all border border-white/5"
                                >
                                    Dön
                                </button>
                                <button
                                    onClick={disconnect}
                                    className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20"
                                >
                                    <PhoneOffIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
