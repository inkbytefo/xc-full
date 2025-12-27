import { MicOffIcon } from "../Icons";

interface VoiceParticipantItemProps {
    sid: string;
    identity: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isLocal: boolean;
    zIndex?: number;
}

export function VoiceParticipantItem({
    identity,
    isSpeaking,
    isMuted,
    isLocal,
    zIndex
}: VoiceParticipantItemProps) {
    return (
        <div
            className={`relative w-8 h-8 rounded-full border-2 border-[#1a1a22] flex items-center justify-center text-xs font-medium ${isSpeaking
                ? "bg-green-500 ring-2 ring-green-400/50 animate-pulse"
                : "bg-gradient-to-br from-indigo-500 to-purple-600"
                }`}
            style={{ zIndex }}
            title={identity + (isLocal ? " (Sen)" : "")}
        >
            {identity[0]?.toUpperCase() || "?"}
            {isMuted && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                    <MicOffIcon className="w-2 h-2 text-white" />
                </div>
            )}
        </div>
    );
}
