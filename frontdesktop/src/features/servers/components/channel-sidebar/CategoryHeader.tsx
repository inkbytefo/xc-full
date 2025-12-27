import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Channel } from "../../../../api/types";
import { ChevronDownIcon } from "../Icons";

interface DroppableCategoryHeaderProps {
    category: Channel;
    isCollapsed: boolean;
    canManageChannels: boolean;
    isDragEnabled: boolean;
    onToggle: () => void;
    onAddChannel?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function DroppableCategoryHeader({
    category,
    isCollapsed,
    canManageChannels,
    isDragEnabled,
    onToggle,
    onAddChannel,
    onEdit,
    onDelete,
}: DroppableCategoryHeaderProps) {
    // Both droppable (for channels) and sortable (for category reordering)
    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `drop-${category.id}`,
        data: { type: 'category', categoryId: category.id }
    });

    const {
        attributes,
        listeners,
        setNodeRef: setSortRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: category.id,
        disabled: !isDragEnabled,
        data: { type: 'category' }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Combine refs
    const setNodeRef = (node: HTMLElement | null) => {
        setDropRef(node);
        setSortRef(node);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group/category flex items-center gap-1 px-1 py-1 rounded transition-colors ${isOver ? "bg-purple-500/20 ring-1 ring-purple-500/50" : ""
                }`}
        >
            {/* Drag Handle for Category */}
            {isDragEnabled && (
                <div
                    {...attributes}
                    {...listeners}
                    className="opacity-0 group-hover/category:opacity-100 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 -ml-0.5 mr-0.5"
                >
                    <svg width="8" height="12" viewBox="0 0 10 16" fill="currentColor">
                        <circle cx="2" cy="2" r="1.5" />
                        <circle cx="8" cy="2" r="1.5" />
                        <circle cx="2" cy="8" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                    </svg>
                </div>
            )}

            <button
                onClick={onToggle}
                className="flex-1 flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
            >
                <ChevronDownIcon
                    className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                />
                {category.name}
            </button>

            {canManageChannels && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover/category:opacity-100 transition-opacity">
                    {onAddChannel && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChannel(); }}
                            className="p-0.5 rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-400"
                            title="Kanal Ekle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-0.5 rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-400"
                            title="Düzenle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-0.5 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400"
                            title="Sil"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
