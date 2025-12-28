// ============================================================================
// IncomingCallModal - Incoming Call Notification UI
// ============================================================================
// WhatsApp-style incoming call notification with countdown timer.
// Shows caller info and accept/reject buttons.
// ============================================================================

import { useState, useEffect } from "react";
import { useIncomingCalls, useCallRemainingTime } from "../hooks";
import type { IncomingCall } from "../../../store/mediaSessionStore";

// ============================================================================
// INLINE ICONS
// ============================================================================

function PhoneIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
        </svg>
    );
}

function VideoIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
        </svg>
    );
}

function PhoneOffIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
        </svg>
    );
}

// ============================================================================
// SINGLE CALL CARD
// ============================================================================

interface IncomingCallCardProps {
    call: IncomingCall;
    onAccept: () => void;
    onReject: () => void;
}

function IncomingCallCard({ call, onAccept, onReject }: IncomingCallCardProps) {
    const remainingTime = useCallRemainingTime(call.id);
    const [progress, setProgress] = useState(100);

    // Update progress bar
    useEffect(() => {
        const totalTime = 30; // 30 seconds
        const newProgress = (remainingTime / totalTime) * 100;
        setProgress(Math.max(0, Math.min(100, newProgress)));
    }, [remainingTime]);

    const isVideo = call.type === "video";
    const CallTypeIcon = isVideo ? VideoIcon : PhoneIcon;

    return (
        <div className="w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
            {/* Header with gradient */}
            <div
                className="h-2"
                style={{
                    background: `linear-gradient(135deg, ${call.from.avatarGradient[0]}, ${call.from.avatarGradient[1]})`,
                }}
            />

            {/* Content */}
            <div className="p-4">
                {/* Caller info */}
                <div className="flex items-center gap-3 mb-4">
                    {/* Avatar */}
                    <div
                        className="w-12 h-12 rounded-full ring-2 ring-white/20 flex items-center justify-center text-white font-bold text-lg"
                        style={{
                            backgroundImage: `linear-gradient(135deg, ${call.from.avatarGradient[0]}, ${call.from.avatarGradient[1]})`,
                        }}
                    >
                        {call.from.displayName[0]?.toUpperCase() || "?"}
                    </div>

                    {/* Name and call type */}
                    <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">
                            {call.from.displayName}
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                            <CallTypeIcon className="w-4 h-4" />
                            <span>{isVideo ? "Görüntülü Arama" : "Sesli Arama"}</span>
                        </div>
                    </div>

                    {/* Countdown */}
                    <div className="text-zinc-500 text-sm font-mono">
                        {remainingTime}s
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    {/* Reject */}
                    <button
                        onClick={onReject}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-all active:scale-95"
                    >
                        <PhoneOffIcon className="w-5 h-5" />
                        <span>Reddet</span>
                    </button>

                    {/* Accept */}
                    <button
                        onClick={onAccept}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-all active:scale-95 shadow-lg shadow-green-500/20"
                    >
                        <CallTypeIcon className="w-5 h-5" />
                        <span>Kabul Et</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IncomingCallModal() {
    const { calls, accept, reject } = useIncomingCalls();

    if (calls.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
            {calls.map((call) => (
                <IncomingCallCard
                    key={call.id}
                    call={call}
                    onAccept={() => accept(call.id)}
                    onReject={() => reject(call.id)}
                />
            ))}
        </div>
    );
}
