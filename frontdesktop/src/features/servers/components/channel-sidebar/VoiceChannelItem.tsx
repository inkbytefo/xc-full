import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Channel } from "../../../../api/types";
import type { ChannelParticipant } from "../../../../lib/websocket/types";
import { DragHandleIcon, getChannelIcon } from "./ChannelIcons";
import type { VoiceParticipant } from "./types";

interface SortableVoiceChannelItemProps {
    channel: Channel;
    isActive: boolean;
    isConnecting: boolean;
    isDragEnabled: boolean;
    isOver: boolean;
    participants: Array<VoiceParticipant | ChannelParticipant>;
    canManage?: boolean;
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function SortableVoiceChannelItem({
    channel,
    isActive,
    isConnecting,
    isDragEnabled,
    isOver,
    participants,
    canManage,
    onClick,
    onEdit,
    onDelete,
}: SortableVoiceChannelItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: channel.id,
        disabled: !isDragEnabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group/channel ${isOver ? "before:absolute before:left-0 before:right-0 before:-top-0.5 before:h-0.5 before:bg-purple-500 before:rounded" : ""}`}
        >
            {/* Channel Button */}
            <div
                className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${isActive
                    ? "bg-green-500/20 text-green-400"
                    : isConnecting
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
            >
                {/* Drag Handle */}
                {isDragEnabled && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="opacity-0 group-hover/channel:opacity-100 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 -ml-1"
                    >
                        <DragHandleIcon />
                    </div>
                )}

                <button onClick={onClick} className="flex-1 flex items-center gap-2 text-left">
                    {getChannelIcon(channel.type)}
                    <span className="truncate text-sm flex-1">{channel.name}</span>
                    {isConnecting && (
                        <div className="h-3 w-3 animate-spin rounded-full border border-yellow-400 border-t-transparent" />
                    )}
                    {(channel.participantCount ?? 0) > 0 && !isActive && (
                        <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                            {channel.participantCount}
                        </span>
                    )}
                </button>

                {canManage && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/channel:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                            title="Düzenle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                            title="Sil"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
                <div className="ml-6 mt-1 space-y-0.5">
                    {participants.map((p, idx) => {
                        const displayName = 'displayName' in p ? p.displayName : ('identity' in p ? p.identity : "Unknown");
                        const handle = 'handle' in p ? p.handle : null;
                        const label = handle ? `@${handle}` : displayName;

                        const isSpeaking = 'isSpeaking' in p ? p.isSpeaking : !!p.isSpeaking;
                        const isMuted = 'isMuted' in p ? p.isMuted : !!p.isMuted;
                        const isLocal = 'isLocal' in p ? p.isLocal : false;
                        const uniqueKey = 'sid' in p ? p.sid : `${'identity' in p ? p.identity : (p as any).userId}-${idx}`;

                        return (
                            <div
                                key={uniqueKey}
                                className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-white/5"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full shrink-0 ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-zinc-600"
                                        }`}
                                />
                                <span className={`text-sm truncate ${isSpeaking ? "text-white font-medium shadow-black drop-shadow-md" : "text-zinc-400 group-hover/participant:text-zinc-300"}`}>
                                    {label}
                                    {isLocal && <span className="text-zinc-500 ml-1">(Sen)</span>}
                                </span>
                                {isMuted && (
                                    <svg className="w-3 h-3 text-red-400 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
