import { SearchIcon, PlusIcon } from "../components";
import { ServerList } from "../components/server-list";
import { Server } from "../../../api/types";

interface ServerSelectionViewProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredServers: Server[];
    selectedServerId: string | null;
    onSelectServer: (serverId: string) => void;
    loading: boolean;
    onExplore: () => void;
    onCreateServer: () => void;
}

export function ServerSelectionView({
    searchQuery,
    setSearchQuery,
    filteredServers,
    selectedServerId,
    onSelectServer,
    loading,
    onExplore,
    onCreateServer,
}: ServerSelectionViewProps) {
    return (
        <>
            {/* Search Bar */}
            <div className="p-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <SearchIcon className="w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        name="server-search"
                        id="server-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Find a server..."
                        className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-500 outline-none"
                    />
                </div>
            </div>

            {/* Your Servers Header */}
            <div className="px-4 py-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Your Servers
                </span>
            </div>

            {/* Server List */}
            {filteredServers.length > 0 ? (
                <ServerList
                    servers={filteredServers}
                    selectedServerId={selectedServerId}
                    onSelectServer={onSelectServer}
                    loading={loading}
                />
            ) : searchQuery ? (
                <div className="flex-1 px-4 py-8 text-center">
                    <p className="text-sm text-zinc-500 mb-4">Sunucu bulunamadı</p>
                    <button
                        onClick={onExplore}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 uppercase tracking-wider"
                    >
                        Tüm sunucuları keşfet
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs italic">
                    Henüz bir sunucuya katılmadınız
                </div>
            )}

            {/* Create Server Button */}
            <div className="p-3 border-t border-white/5">
                <button
                    onClick={onCreateServer}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-300"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <PlusIcon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium uppercase tracking-wider">
                        Create Server
                    </span>
                </button>
            </div>
        </>
    );
}
