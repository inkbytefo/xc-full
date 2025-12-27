// ============================================================================
// MessageList - Virtualized message list container
// ============================================================================

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { MessageListProps } from "./types";
import { MessageItem } from "./MessageItem";
import { HashIcon } from "../Icons";
import { Skeleton } from "../../../../components/ui/Skeleton";

export function MessageList({
    messages,
    loading,
    channelName,
    currentUserId,
    editingMessageId,
    editText,
    messagesEndRef,
    onContextMenu,
    onStartEdit,
    onSubmitEdit,
    onCancelEdit,
    onDelete,
    onEditTextChange,
    showEditActions = true,
    variant = "full",
}: MessageListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 20,
    });

    // Loading state
    if (loading) {
        return (
            <div className={`${variant === "panel" ? "p-3" : "p-4"} flex-1 overflow-y-auto`}>
                <div className="space-y-6 pt-8 px-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex gap-4 opacity-50">
                            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                            <div className="space-y-2 flex-1 pt-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-full max-w-md bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Empty state
    if (messages.length === 0) {
        return (
            <div className={`${variant === "panel" ? "p-3" : "p-4"} flex-1 overflow-y-auto`}>
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <div className="w-16 h-16 mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                        <HashIcon className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-medium text-zinc-300">Welcome to #{channelName}!</p>
                    <p className="text-sm mt-1">This is the start of the #{channelName} channel.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={parentRef}
            className={`${variant === "panel" ? "p-3" : "p-4"} flex-1 overflow-y-auto`}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const message = messages[virtualItem.index];
                    const isOwn = message.authorId === currentUserId;
                    const isEditing = editingMessageId === message.id;

                    return (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            className="absolute top-0 left-0 w-full pb-4"
                            style={{
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <MessageItem
                                message={message}
                                isOwn={isOwn}
                                isEditing={isEditing}
                                editText={editText}
                                onEditTextChange={onEditTextChange}
                                onSubmitEdit={onSubmitEdit}
                                onCancelEdit={onCancelEdit}
                                onContextMenu={(e) => onContextMenu(e, message)}
                                onStartEdit={() => onStartEdit(message)}
                                onDelete={() => onDelete(message)}
                                showActions={showEditActions}
                            />
                        </div>
                    );
                })}
            </div>
            <div
                ref={messagesEndRef}
                style={{
                    position: "relative",
                    top: messages.length > 0 ? `${virtualizer.getTotalSize()}px` : 0,
                }}
            />
        </div>
    );
}
