// ============================================================================
// MessageItem - Single message with avatar and actions
// ============================================================================

import type { MessageItemProps } from "./types";
import { EditIcon, TrashIcon } from "../Icons";

export function MessageItem({
    message,
    isOwn,
    isEditing,
    editText,
    onEditTextChange,
    onSubmitEdit,
    onCancelEdit,
    onContextMenu,
    onStartEdit,
    onDelete,
    showActions = true,
}: MessageItemProps) {
    return (
        <div
            className="flex gap-3 group hover:bg-white/5 -mx-4 px-4 py-1 rounded"
            onContextMenu={onContextMenu}
        >
            {/* Avatar */}
            <div
                className="w-10 h-10 rounded-full shrink-0"
                style={{
                    backgroundImage:
                        message.author?.avatarGradient && message.author.avatarGradient.length === 2
                            ? `linear-gradient(135deg, ${message.author.avatarGradient[0]}, ${message.author.avatarGradient[1]})`
                            : "linear-gradient(135deg, #333, #666)",
                }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className="font-medium text-zinc-100">
                        {message.author?.displayName || "Unknown"}
                    </span>
                    <span className="text-xs text-zinc-500">
                        {new Date(message.createdAt).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                    {message.isEdited && (
                        <span className="text-xs text-zinc-600">(düzenlendi)</span>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="text"
                            value={editText}
                            onChange={(e) => onEditTextChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") onSubmitEdit();
                                if (e.key === "Escape") onCancelEdit();
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-purple-500 text-white text-sm outline-none"
                            autoFocus
                        />
                        <button
                            onClick={onSubmitEdit}
                            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded"
                        >
                            ✓
                        </button>
                        <button
                            onClick={onCancelEdit}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <p className="text-zinc-200 break-words">{message.content}</p>
                )}
            </div>

            {/* Quick action buttons (visible on hover) */}
            {isOwn && !isEditing && showActions && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                        onClick={onStartEdit}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 rounded"
                        title="Düzenle"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                        title="Sil"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
