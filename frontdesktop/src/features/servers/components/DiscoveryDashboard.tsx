import { useState, useEffect } from "react";
import { SearchIcon, CommunityIcon, PlusIcon } from "./Icons";
import { searchServers } from "../serversApi";
import type { Server } from "../../../api/types";

interface DiscoveryDashboardProps {
    onJoinServer: (serverId: string) => Promise<void>;
    onSelectServer: (serverId: string) => void;
}

export function DiscoveryDashboard({ onJoinServer, onSelectServer }: DiscoveryDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadServers = async () => {
            setLoading(true);
            try {
                const results = await searchServers(searchTerm);
                setServers(results);
            } catch (error) {
                console.error("Failed to load discovery servers:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(loadServers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]">
            {/* Hero Section */}
            <div className="relative h-64 shrink-0 flex flex-col items-center justify-center px-6 overflow-hidden">
                {/* Background Decorative Elements */}
                <div className="absolute top-[-10%] left-[-5%] w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-64 h-64 bg-rose-600/20 blur-[100px] rounded-full" />

                <div className="relative text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
                        Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-rose-400">Community</span>
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-lg mx-auto">
                        Discover servers that match your interests, from gaming to tech and everything in between.
                    </p>
                </div>

                {/* Global Search Bar */}
                <div className="relative w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <SearchIcon className="w-5 h-5 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search for exploreable communities..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 backdrop-blur-md transition-all shadow-2xl"
                    />
                </div>
            </div>

            {/* Grid Section */}
            <div className="flex-1 overflow-y-auto px-6 pb-12">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CommunityIcon className="w-5 h-5 text-purple-400" />
                            {searchTerm ? `Results for "${searchTerm}"` : "Featured Communities"}
                        </h2>
                        <div className="text-sm text-zinc-500">
                            {loading ? "Searching..." : `${servers.length} servers found`}
                        </div>
                    </div>

                    {loading && servers.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                            ))}
                        </div>
                    ) : servers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <SearchIcon className="w-8 h-8 text-zinc-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-300">No servers found</h3>
                            <p className="text-zinc-500">Try searching for something else or check your spelling.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                            {servers.map((server) => (
                                <div
                                    key={server.id}
                                    onClick={() => onSelectServer(server.id)}
                                    className="group relative flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/20 hover:translate-y-[-4px] transition-all duration-300 cursor-pointer"
                                >
                                    {/* Card Header Background */}
                                    <div
                                        className="h-24 w-full"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                                            opacity: 0.8
                                        }}
                                    />

                                    {/* Server Icon Overlay */}
                                    <div className="absolute top-12 left-6">
                                        <div
                                            className="w-16 h-16 rounded-2xl border-4 border-[#0f0f15] flex items-center justify-center text-white text-2xl font-black shadow-xl"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                                            }}
                                        >
                                            {server.name[0].toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 pt-10 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-lg font-bold text-white truncate pr-2">{server.name}</h3>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20 shrink-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                {server.memberCount}
                                            </div>
                                        </div>

                                        <p className="text-sm text-zinc-400 line-clamp-2 mb-6 flex-1 italic">
                                            {server.description || "A place for community members to hang out and chat."}
                                        </p>

                                        <button
                                            onClick={() => onJoinServer(server.id)}
                                            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-900/20 active:scale-95 flex items-center justify-center gap-2 group/btn"
                                        >
                                            <span>Join Community</span>
                                            <PlusIcon className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
