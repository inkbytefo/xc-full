// ============================================================================
// MessageContextMenu - Right-click menu for message actions
// ============================================================================

import type { MessageContextMenuProps } from "./types";
import { EditIcon, TrashIcon } from "../Icons";

export function MessageContextMenu({
    x,
    y,
    onEdit,
    onDelete,
    onClose,
}: MessageContextMenuProps) {
    return (
        <div
            className="fixed z-50 bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]"
            style={{ top: y, left: x }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={() => {
                    onEdit();
                    onClose();
                }}
                className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/10 flex items-center gap-2"
            >
                <EditIcon className="w-4 h-4" />
                Düzenle
            </button>
            <button
                onClick={() => {
                    onDelete();
                    onClose();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
            >
                <TrashIcon className="w-4 h-4" />
                Sil
            </button>
        </div>
    );
}
