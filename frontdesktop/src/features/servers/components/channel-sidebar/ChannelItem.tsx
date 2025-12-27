import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Channel } from "../../../../api/types";
import { DragHandleIcon, getChannelIcon } from "./ChannelIcons";

interface SortableChannelItemProps {
    channel: Channel;
    isSelected: boolean;
    isDragEnabled: boolean;
    isOver: boolean;
    canManage?: boolean;
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function SortableChannelItem({
    channel,
    isSelected,
    isDragEnabled,
    isOver,
    canManage,
    onClick,
    onEdit,
    onDelete,
}: SortableChannelItemProps) {
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
            <div
                className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${isSelected
                    ? "bg-white/10 text-zinc-100"
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
                    <span className="truncate text-sm">{channel.name}</span>
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
        </div>
    );
}
