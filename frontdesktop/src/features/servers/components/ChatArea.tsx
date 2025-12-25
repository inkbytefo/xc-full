import { useState, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChannelMessage, Channel } from "../../../api/types";
import { Skeleton } from "../../../components/ui/Skeleton";
import { HashIcon, BellIcon, PlusIcon, EmojiIcon, GiftIcon } from "./Icons";
import { useAuthStore } from "../../../store/authStore";
import { EmojiPicker } from "../../../components/EmojiPicker";

interface ChatAreaProps {
    channel: Channel;
    messages: ChannelMessage[];
    messagesLoading: boolean;
    sending: boolean;
    messageText: string;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    onMessageChange: (text: string) => void;
    onSend: () => void;
    variant?: "full" | "panel";
    headerIcon?: React.ReactNode;
    headerBadge?: React.ReactNode;
    // New: Edit/Delete handlers
    onEditMessage?: (messageId: string, content: string) => Promise<void>;
    onDeleteMessage?: (messageId: string) => Promise<void>;
    // New: Typing indicator
    onTyping?: () => void;
    typingUsers?: string[];
}

export function ChatArea({
    channel,
    messages,
    messagesLoading,
    sending,
    messageText,
    messagesEndRef,
    onMessageChange,
    onSend,
    variant = "full",
    headerIcon,
    headerBadge,
    onEditMessage,
    onDeleteMessage,
    onTyping,
    typingUsers = [],
}: ChatAreaProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const currentUser = useAuthStore((s) => s.user);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChannelMessage } | null>(null);

    // Edit state
    const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null);
    const [editText, setEditText] = useState("");

    // Emoji picker state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 20,
    });

    // Handle message context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, message: ChannelMessage) => {
        if (message.authorId !== currentUser?.id) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, message });
    }, [currentUser?.id]);

    // Close context menu on click
    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Start editing
    const handleStartEdit = useCallback((message: ChannelMessage) => {
        setEditingMessage(message);
        setEditText(message.content);
        setContextMenu(null);
    }, []);

    // Submit edit
    const handleSubmitEdit = useCallback(async () => {
        if (!editingMessage || !editText.trim() || !onEditMessage) return;

        try {
            await onEditMessage(editingMessage.id, editText.trim());
            setEditingMessage(null);
            setEditText("");
        } catch (e) {
            console.error("Edit failed:", e);
        }
    }, [editingMessage, editText, onEditMessage]);

    // Cancel edit
    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
        setEditText("");
    }, []);

    // Delete message
    const handleDelete = useCallback(async (message: ChannelMessage) => {
        if (!onDeleteMessage) return;
        if (!confirm("Bu mesajı silmek istediğinizden emin misiniz?")) return;

        setContextMenu(null);
        try {
            await onDeleteMessage(message.id);
        } catch (e) {
            console.error("Delete failed:", e);
        }
    }, [onDeleteMessage]);

    // Handle input change with typing indicator
    const handleInputChange = useCallback((value: string) => {
        onMessageChange(value);
        onTyping?.();
    }, [onMessageChange, onTyping]);

    return (
        <>
            {/* Channel Header */}
            <div
                className={`${variant === "panel" ? "h-11 px-3" : "h-12 px-4"} flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-xl`}
            >
                <div className="flex items-center gap-2">
                    {headerIcon ?? <HashIcon className="w-5 h-5 text-zinc-500" />}
                    <span className="font-semibold text-zinc-100">{channel.name}</span>
                    {headerBadge}
                    {channel.description && (
                        <>
                            <div className="w-[1px] h-5 bg-white/10 mx-2" />
                            <span className="text-sm text-zinc-500 truncate">{channel.description}</span>
                        </>
                    )}
                </div>
                {variant === "full" && (
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400">
                            <BellIcon className="w-5 h-5" />
                        </button>
                        <div className="relative">
                            <input
                                type="text"
                                name="channel-search"
                                id="channel-search"
                                placeholder="Search"
                                className="w-40 px-3 py-1.5 text-sm rounded-md bg-white/5 border border-white/10 text-zinc-300 placeholder-zinc-500 outline-none focus:border-white/20"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div
                ref={parentRef}
                className={`${variant === "panel" ? "p-3" : "p-4"} flex-1 overflow-y-auto`}
                onClick={handleCloseContextMenu}
            >
                {messagesLoading ? (
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
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <div className="w-16 h-16 mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                            <HashIcon className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <p className="text-lg font-medium text-zinc-300">Welcome to #{channel.name}!</p>
                        <p className="text-sm mt-1">This is the start of the #{channel.name} channel.</p>
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const message = messages[virtualItem.index];
                            const isOwn = message.authorId === currentUser?.id;
                            const isEditing = editingMessage?.id === message.id;

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
                                    <div
                                        className="flex gap-3 group hover:bg-white/5 -mx-4 px-4 py-1 rounded"
                                        onContextMenu={(e) => handleContextMenu(e, message)}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full shrink-0"
                                            style={{
                                                backgroundImage:
                                                    message.author?.avatarGradient && message.author.avatarGradient.length === 2
                                                        ? `linear-gradient(135deg, ${message.author.avatarGradient[0]}, ${message.author.avatarGradient[1]})`
                                                        : "linear-gradient(135deg, #333, #666)",
                                            }}
                                        />
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
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleSubmitEdit();
                                                            if (e.key === "Escape") handleCancelEdit();
                                                        }}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-purple-500 text-white text-sm outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSubmitEdit}
                                                        className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
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
                                        {isOwn && !isEditing && onEditMessage && onDeleteMessage && (
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                <button
                                                    onClick={() => handleStartEdit(message)}
                                                    className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 rounded"
                                                    title="Düzenle"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(message)}
                                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                                                    title="Sil"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div
                    ref={messagesEndRef}
                    style={{ position: "relative", top: messages.length > 0 ? `${virtualizer.getTotalSize()}px` : 0 }}
                />
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <div className="px-4 py-2 text-sm text-zinc-400 flex items-center gap-2 border-t border-white/5">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>{typingUsers.join(", ")} yazıyor...</span>
                </div>
            )}

            {/* Input */}
            <div className={`${variant === "panel" ? "p-3" : "p-4"} shrink-0 border-t border-white/10 bg-[#0a0a0f]/60 backdrop-blur-md`}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <button className="text-zinc-400 hover:text-zinc-300" title="Dosya Ekle">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        name="message-input"
                        id="message-input"
                        value={messageText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
                        placeholder={`Message #${channel.name}`}
                        disabled={sending}
                        className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none disabled:opacity-50"
                        autoComplete="off"
                    />
                    <div className="flex items-center gap-2 text-zinc-400 relative">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`hover:text-zinc-300 ${showEmojiPicker ? 'text-purple-400' : ''}`}
                            title="Emoji"
                        >
                            <EmojiIcon className="w-5 h-5" />
                        </button>
                        <button className="hover:text-zinc-300" title="GIF">
                            <GiftIcon className="w-5 h-5" />
                        </button>

                        {/* Emoji Picker Popup */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-10 right-0 z-50">
                                <EmojiPicker
                                    onSelect={(emoji) => onMessageChange(messageText + emoji)}
                                    onClose={() => setShowEmojiPicker(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => handleStartEdit(contextMenu.message)}
                        className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/10 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Düzenle
                    </button>
                    <button
                        onClick={() => handleDelete(contextMenu.message)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Sil
                    </button>
                </div>
            )}
        </>
    );
}
