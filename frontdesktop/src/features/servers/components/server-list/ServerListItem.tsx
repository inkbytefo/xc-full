import { Server } from "../../../../api/types";

interface ServerListItemProps {
    server: Server;
    style: React.CSSProperties;
    isSelected: boolean;
    onSelect: (serverId: string) => void;
}

export function ServerListItem({ server, style, isSelected, onSelect }: ServerListItemProps) {
    return (
        <div style={style}>
            <button
                onClick={() => onSelect(server.id)}
                className={`w-full h-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isSelected
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
}
