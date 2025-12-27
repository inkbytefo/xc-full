// ============================================================================
// TypingIndicator - Shows who is typing
// ============================================================================

import type { TypingIndicatorProps } from "./types";

export function TypingIndicator({ users }: TypingIndicatorProps) {
    if (users.length === 0) return null;

    return (
        <div className="px-4 py-2 text-sm text-zinc-400 flex items-center gap-2 border-t border-white/5">
            <div className="flex gap-1">
                <span
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                />
                <span
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                />
                <span
                    className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                />
            </div>
            <span>
                {users.map((u) => u.handle || u.displayName || "Unknown User").join(", ")} yazıyor...
            </span>
        </div>
    );
}
