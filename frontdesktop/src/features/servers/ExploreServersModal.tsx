import { useEffect, useState } from "react";
import { searchServers } from "./serversApi";
import type { Server } from "../../api/types";

interface ExploreServersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoin: (serverId: string) => void;
}

export function ExploreServersModal({ isOpen, onClose, onJoin }: ExploreServersModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const load = async () => {
            setLoading(true);
            try {
                const results = await searchServers(searchTerm);
                setServers(results);
            } catch (error) {
                console.error("Failed to search servers:", error);
                setServers([]);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(load, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [isOpen, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white">Explore Communities</h2>
                        <p className="text-sm text-zinc-400">Discover new communities to join</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search for servers..."
                            className="w-full bg-[#0f0f15] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-zinc-200 placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Server List */}
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : servers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            {searchTerm ? "No servers found" : "Type to search servers"}
                        </div>
                    ) : (
                        servers.map((server) => (
                            <div
                                key={server.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                                    }}
                                >
                                    {server.name[0].toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-zinc-100 truncate">{server.name}</h3>
                                        {server.memberCount > 100 && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                POPULAR
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-400 truncate">{server.description}</p>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            {server.memberCount} Members
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onJoin(server.id)}
                                    className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-purple-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    Join
                                </button>
                            </div>
                        )))}
                </div>
            </div>
        </div>
    );
}
