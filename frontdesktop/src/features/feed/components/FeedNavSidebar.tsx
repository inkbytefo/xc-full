// ============================================================================
// FeedNavSidebar - Left Navigation Sidebar
// ============================================================================

import type { ReactNode } from "react";
import type { TimelineFilter } from "../feedApi";

interface FeedNavSidebarProps {
    activeFilter: TimelineFilter;
    onFilterChange: (filter: TimelineFilter) => void;
}

const navItems: { key: TimelineFilter | "explore"; label: string; icon: ReactNode }[] = [
    {
        key: "all",
        label: "Sana özel",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ),
    },
    {
        key: "friends",
        label: "Takip edilenler",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
    },
    {
        key: "servers",
        label: "Sunucular",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        ),
    },
    {
        key: "explore",
        label: "# Explore",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
        ),
    },
];

export function FeedNavSidebar({ activeFilter, onFilterChange }: FeedNavSidebarProps) {
    return (
        <nav className="h-full py-4 px-3">
            <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                    const isActive = item.key === activeFilter;
                    const isExplore = item.key === "explore";

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => !isExplore && onFilterChange(item.key as TimelineFilter)}
                            disabled={isExplore}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${isActive
                                ? "bg-purple-500/20 text-purple-300 font-semibold"
                                : isExplore
                                    ? "text-zinc-600 cursor-not-allowed"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                }`}
                        >
                            <span className={isActive ? "text-purple-400" : ""}>{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                            {isExplore && (
                                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                                    Yakında
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
