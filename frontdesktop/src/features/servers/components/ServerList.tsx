import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Server } from "../../../api/types";
import { Skeleton } from "../../../components/ui/Skeleton";

interface ServerListProps {
    servers: Server[];
    selectedServerId: string | null;
    onSelectServer: (serverId: string) => void;
    loading: boolean;
}

export function ServerList({ servers, selectedServerId, onSelectServer, loading }: ServerListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: servers.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60, // 56px + 4px gap
        overscan: 5,
    });

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32 bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (servers.length === 0) {
        return <div className="text-center py-4 text-zinc-500 text-sm">Sunucu bulunamadı</div>;
    }

    return (
        <div ref={parentRef} className="flex-1 overflow-y-auto px-2">
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const server = servers[virtualItem.index];
                    return (
                        <div
                            key={server.id}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '60px', // Fixed height including gap
                                transform: `translateY(${virtualItem.start}px)`,
                                paddingBottom: '4px', // Emulate gap
                            }}
                        >
                            <button
                                onClick={() => onSelectServer(server.id)}
                                className={`w-full h-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${selectedServerId === server.id
                                    ? "bg-white/10"
                                    : "hover:bg-white/5"
                                    }`}
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                                    }}
                                >
                                    {server.name?.[0]?.toUpperCase() || "?"}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="text-sm font-medium text-zinc-200 truncate">{server.name}</div>
                                    <div className="text-xs text-zinc-500">Tap to view channels</div>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

