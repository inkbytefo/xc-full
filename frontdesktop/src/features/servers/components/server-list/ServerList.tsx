import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Server } from "../../../../api/types";
import { Skeleton } from "../../../../components/ui/Skeleton";
import { ServerListItem } from "./ServerListItem";

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
                        <ServerListItem
                            key={server.id}
                            server={server}
                            isSelected={selectedServerId === server.id}
                            onSelect={onSelectServer}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '60px', // Fixed height including gap
                                transform: `translateY(${virtualItem.start}px)`,
                                paddingBottom: '4px', // Emulate gap
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
