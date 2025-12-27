// ============================================================================
// FeedTabs - Animated Tab Switcher
// ============================================================================

import type { TimelineFilter } from "../feedApi";

interface FeedTabsProps {
    activeFilter: TimelineFilter;
    onFilterChange: (filter: TimelineFilter) => void;
}

const tabs: { key: TimelineFilter; label: string }[] = [
    { key: "all", label: "Sana özel" },
    { key: "friends", label: "Takip edilenler" },
    { key: "servers", label: "Sunucular" },
];

export function FeedTabs({ activeFilter, onFilterChange }: FeedTabsProps) {
    return (
        <div className="flex border-b border-white/10 bg-black/20 backdrop-blur-sm">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    onClick={() => onFilterChange(tab.key)}
                    className={`relative flex-1 py-4 text-center text-sm font-medium transition-colors ${activeFilter === tab.key
                            ? "text-zinc-100"
                            : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                        }`}
                >
                    {tab.label}
                    {activeFilter === tab.key && (
                        <div className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-purple-500" />
                    )}
                </button>
            ))}
        </div>
    );
}
