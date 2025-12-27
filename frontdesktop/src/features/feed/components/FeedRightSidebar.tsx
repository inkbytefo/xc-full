// ============================================================================
// FeedRightSidebar - Search, Trends, Popular Users/Servers
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsers, type UserProfile } from "../../profile/userApi";
import { searchServers } from "../../../features/servers/serversApi";
import type { Server } from "../../../api/types";

// Placeholder trend data
const trendingTopics = [
    { id: 1, tag: "#GameDev", posts: "12.4K" },
    { id: 2, tag: "#ReactNative", posts: "8.2K" },
    { id: 3, tag: "#WebDev", posts: "6.8K" },
    { id: 4, tag: "#Tauri", posts: "4.1K" },
];

// Placeholder popular users
const popularUsers = [
    { id: "1", displayName: "Alex Chen", handle: "alexchen", gradient: ["#8B5CF6", "#EC4899"] },
    { id: "2", displayName: "Sarah Dev", handle: "sarahdev", gradient: ["#06B6D4", "#3B82F6"] },
    { id: "3", displayName: "Max Studio", handle: "maxstudio", gradient: ["#10B981", "#059669"] },
];

// Placeholder popular servers
const popularServers = [
    { id: "1", name: "React Türkiye", members: 1240, gradient: ["#61DAFB", "#3B82F6"] },
    { id: "2", name: "GameDev Hub", members: 890, gradient: ["#F59E0B", "#EF4444"] },
    { id: "3", name: "Design System", members: 560, gradient: ["#8B5CF6", "#EC4899"] },
];

export function FeedRightSidebar() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [userResults, setUserResults] = useState<UserProfile[]>([]);
    const [serverResults, setServerResults] = useState<Server[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Search when query changes
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setUserResults([]);
            setServerResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setSearching(true);
            try {
                const [users, servers] = await Promise.all([
                    searchUsers(searchQuery, 5).catch(() => []),
                    searchServers(searchQuery, 5).catch(() => []),
                ]);
                setUserResults(users);
                setServerResults(servers);
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const hasResults = userResults.length > 0 || serverResults.length > 0;
    const showDropdown = searchFocused && (searchQuery.length >= 2 || searching);

    return (
        <aside className="h-full flex flex-col">
            {/* Sticky Search Bar */}
            <div ref={searchRef} className="relative shrink-0 p-3 border-b border-white/5">
                <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-black/30 border transition-colors ${searchFocused ? "border-purple-500/50" : "border-white/10"
                        }`}
                >
                    <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        placeholder="Kullanıcı veya sunucu ara..."
                        className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                    />
                    {searching && (
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-purple-500 rounded-full animate-spin" />
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showDropdown && (
                    <div className="absolute top-full left-3 right-3 mt-2 rounded-xl bg-[#0f0f15] border border-white/10 shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                        {!hasResults && !searching && searchQuery.length >= 2 && (
                            <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                                Sonuç bulunamadı
                            </div>
                        )}

                        {/* Users */}
                        {userResults.length > 0 && (
                            <div>
                                <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase bg-black/20">
                                    Kullanıcılar
                                </div>
                                {userResults.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => {
                                            navigate(`/profile/${user.id}`);
                                            setSearchQuery("");
                                            setSearchFocused(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full shrink-0"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-zinc-200 truncate">
                                                {user.displayName}
                                            </div>
                                            <div className="text-xs text-zinc-500">@{user.handle}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Servers */}
                        {serverResults.length > 0 && (
                            <div>
                                <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase bg-black/20">
                                    Sunucular
                                </div>
                                {serverResults.map((server) => (
                                    <button
                                        key={server.id}
                                        onClick={() => {
                                            navigate(`/servers/${server.id}/profile`);
                                            setSearchQuery("");
                                            setSearchFocused(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                                            }}
                                        >
                                            {server.name[0]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-zinc-200 truncate">
                                                {server.name}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {server.memberCount || 0} üye
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-3 py-4 space-y-4">
                <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                    <h3 className="px-4 py-3 text-sm font-semibold text-zinc-200 border-b border-white/5">
                        🔥 Trendler
                    </h3>
                    <div className="divide-y divide-white/5">
                        {trendingTopics.map((topic, index) => (
                            <button
                                key={topic.id}
                                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
                            >
                                <div className="text-[10px] text-zinc-500 mb-0.5">
                                    {index + 1} · Trend
                                </div>
                                <div className="text-sm font-medium text-zinc-200">{topic.tag}</div>
                                <div className="text-xs text-zinc-500">{topic.posts} gönderi</div>
                            </button>
                        ))}
                    </div>
                    <button className="w-full px-4 py-3 text-left text-sm text-purple-400 hover:bg-white/5 transition-colors">
                        Daha fazla göster
                    </button>
                </div>

                {/* Popular Users */}
                <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                    <h3 className="px-4 py-3 text-sm font-semibold text-zinc-200 border-b border-white/5">
                        👥 Popüler Kullanıcılar
                    </h3>
                    <div className="divide-y divide-white/5">
                        {popularUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <div
                                    className="w-10 h-10 rounded-full shrink-0"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${user.gradient[0]}, ${user.gradient[1]})`,
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-zinc-200 truncate">
                                        {user.displayName}
                                    </div>
                                    <div className="text-xs text-zinc-500">@{user.handle}</div>
                                </div>
                                <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                                    Takip Et
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="w-full px-4 py-3 text-left text-sm text-purple-400 hover:bg-white/5 transition-colors">
                        Daha fazla göster
                    </button>
                </div>

                {/* Popular Servers */}
                <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                    <h3 className="px-4 py-3 text-sm font-semibold text-zinc-200 border-b border-white/5">
                        🌐 Popüler Sunucular
                    </h3>
                    <div className="divide-y divide-white/5">
                        {popularServers.map((server) => (
                            <div
                                key={server.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${server.gradient[0]}, ${server.gradient[1]})`,
                                    }}
                                >
                                    {server.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-zinc-200 truncate">
                                        {server.name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {server.members.toLocaleString()} üye
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/10 text-zinc-200 hover:bg-white/20 transition-colors">
                                    Katıl
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="w-full px-4 py-3 text-left text-sm text-purple-400 hover:bg-white/5 transition-colors">
                        Daha fazla göster
                    </button>
                </div>
            </div>
        </aside>
    );
}
