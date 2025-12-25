// ============================================================================
// Global Search Modal Component
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalSearch, type SearchUser, type SearchServer, type SearchPost } from "../../../api/searchApi";

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<SearchUser[]>([]);
    const [servers, setServers] = useState<SearchServer[]>([]);
    const [posts, setPosts] = useState<SearchPost[]>([]);
    const [activeTab, setActiveTab] = useState<"all" | "users" | "servers" | "posts">("all");

    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<number | null>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery("");
            setUsers([]);
            setServers([]);
            setPosts([]);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setUsers([]);
            setServers([]);
            setPosts([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = window.setTimeout(async () => {
            setLoading(true);
            try {
                const results = await globalSearch(query, 5);
                setUsers(results.users || []);
                setServers(results.servers || []);
                setPosts(results.posts || []);
            } catch {
                setUsers([]);
                setServers([]);
                setPosts([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [query]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const hasResults = users.length > 0 || servers.length > 0 || posts.length > 0;

    const handleUserClick = (userId: string) => {
        onClose();
        navigate(`/profile/${userId}`);
    };

    const handleServerClick = (serverId: string) => {
        onClose();
        navigate(`/servers/${serverId}`);
    };

    const handlePostClick = (postId: string) => {
        onClose();
        navigate(`/posts/${postId}`);
    };

    const tabs = [
        { key: "all" as const, label: "Tümü" },
        { key: "users" as const, label: `Kullanıcılar${users.length > 0 ? ` (${users.length})` : ""}` },
        { key: "servers" as const, label: `Sunucular${servers.length > 0 ? ` (${servers.length})` : ""}` },
        { key: "posts" as const, label: `Gönderiler${posts.length > 0 ? ` (${posts.length})` : ""}` },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Kullanıcı, sunucu veya gönderi ara..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 text-lg"
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                {hasResults && (
                    <div className="flex border-b border-white/10">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.key
                                        ? "text-purple-400 border-b-2 border-purple-500"
                                        : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {!query.trim() ? (
                        <div className="p-8 text-center text-zinc-500">
                            <svg className="w-12 h-12 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="font-medium">Aramaya başla</p>
                            <p className="text-sm mt-1">Kullanıcı, sunucu veya gönderi ara</p>
                        </div>
                    ) : query.length < 2 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="text-sm">En az 2 karakter gir</p>
                        </div>
                    ) : loading ? (
                        <div className="p-8 text-center">
                            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : !hasResults ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="font-medium">Sonuç bulunamadı</p>
                            <p className="text-sm mt-1">"{query}" için eşleşme yok</p>
                        </div>
                    ) : (
                        <>
                            {/* Users */}
                            {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
                                <div>
                                    {activeTab === "all" && (
                                        <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white/5">
                                            Kullanıcılar
                                        </div>
                                    )}
                                    {users.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleUserClick(user.id)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full"
                                                style={{
                                                    backgroundImage: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
                                                }}
                                            />
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-white truncate">{user.displayName}</span>
                                                    {user.isVerified && <span className="text-purple-400 text-sm">✓</span>}
                                                </div>
                                                <div className="text-sm text-zinc-500 truncate">@{user.handle}</div>
                                            </div>
                                            <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Servers */}
                            {(activeTab === "all" || activeTab === "servers") && servers.length > 0 && (
                                <div>
                                    {activeTab === "all" && (
                                        <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white/5">
                                            Sunucular
                                        </div>
                                    )}
                                    {servers.map((server) => (
                                        <button
                                            key={server.id}
                                            onClick={() => handleServerClick(server.id)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                                                {server.icon ? (
                                                    <img src={server.icon} alt="" className="w-full h-full rounded-lg object-cover" />
                                                ) : (
                                                    server.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="font-medium text-white truncate">{server.name}</div>
                                                <div className="text-sm text-zinc-500">{server.memberCount} üye</div>
                                            </div>
                                            <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Posts */}
                            {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
                                <div>
                                    {activeTab === "all" && (
                                        <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white/5">
                                            Gönderiler
                                        </div>
                                    )}
                                    {posts.map((post) => (
                                        <button
                                            key={post.id}
                                            onClick={() => handlePostClick(post.id)}
                                            className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                                        >
                                            <div className="text-sm text-zinc-500 mb-1">
                                                <span className="font-medium text-zinc-300">{post.authorDisplayName}</span>
                                                {" "}@{post.authorHandle}
                                            </div>
                                            <div className="text-white line-clamp-2">{post.content}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-white/5 text-center">
                    <span className="text-xs text-zinc-500">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">ESC</kbd> kapatmak için
                    </span>
                </div>
            </div>
        </div>
    );
}
