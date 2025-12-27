// ============================================================================
// ChatHeader - Channel header with title and description
// ============================================================================

import type { ChatHeaderProps } from "./types";
import { HashIcon, BellIcon, VolumeIcon, VideoIcon, StageIcon } from "../Icons";

// Megaphone icon for announcement channels
function MegaphoneIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
        </svg>
    );
}

// Hybrid icon for text+voice channels
function HybridIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
            <circle cx="18" cy="6" r="3" strokeWidth={2} />
        </svg>
    );
}

// Helper function to get the icon for a channel type
function getChannelHeaderIcon(type: string) {
    switch (type) {
        case "announcement":
            return <MegaphoneIcon className="w-5 h-5 text-yellow-500" />;
        case "voice":
            return <VolumeIcon className="w-5 h-5 text-green-400" />;
        case "video":
            return <VideoIcon className="w-5 h-5 text-blue-400" />;
        case "stage":
            return <StageIcon className="w-5 h-5 text-purple-400" />;
        case "hybrid":
            return <HybridIcon className="w-5 h-5 text-purple-400" />;
        case "text":
        default:
            return <HashIcon className="w-5 h-5 text-zinc-500" />;
    }
}

// Badge component for channel types
function ChannelTypeBadge({ type }: { type: string }) {
    if (type === "announcement") {
        return (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                Duyuru
            </span>
        );
    }
    if (type === "hybrid") {
        return (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Hybrid
            </span>
        );
    }
    return null;
}

export function ChatHeader({
    channel,
    variant = "full",
    headerIcon,
    headerBadge,
}: ChatHeaderProps) {
    return (
        <div
            className={`${variant === "panel" ? "h-11 px-3" : "h-12 px-4"} flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-xl`}
        >
            <div className="flex items-center gap-2">
                {headerIcon ?? getChannelHeaderIcon(channel.type)}
                <span className="font-semibold text-zinc-100">{channel.name}</span>
                {headerBadge ?? <ChannelTypeBadge type={channel.type} />}
                {channel.description && (
                    <>
                        <div className="w-[1px] h-5 bg-white/10 mx-2" />
                        <span className="text-sm text-zinc-500 truncate">{channel.description}</span>
                    </>
                )}
            </div>
            {variant === "full" && (
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400">
                        <BellIcon className="w-5 h-5" />
                    </button>
                    <div className="relative">
                        <input
                            type="text"
                            name="channel-search"
                            id="channel-search"
                            placeholder="Search"
                            className="w-40 px-3 py-1.5 text-sm rounded-md bg-white/5 border border-white/10 text-zinc-300 placeholder-zinc-500 outline-none focus:border-white/20"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
