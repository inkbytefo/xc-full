// ============================================================================
// ChatHeader - Channel header with title and description
// ============================================================================

import type { ChatHeaderProps } from "./types";
import { HashIcon, BellIcon } from "../Icons";

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
                {headerIcon ?? <HashIcon className="w-5 h-5 text-zinc-500" />}
                <span className="font-semibold text-zinc-100">{channel.name}</span>
                {headerBadge}
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
