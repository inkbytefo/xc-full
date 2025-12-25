// ============================================================================
// DmChatArea - DM Messages Area
// ============================================================================

import { useState, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Message, Conversation } from "../../../api/types";
import { useAuthStore } from "../../../store/authStore";
import { useOnlineStatus } from "../../../lib/websocket/useOnlineStatus";
import { EmojiPicker } from "../../../components/EmojiPicker";

interface DmChatAreaProps {
    conversation: Conversation;
    messages: Message[];
    messagesLoading: boolean;
    sending: boolean;
    messageText: string;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    typingUsers: string[];
    onMessageChange: (text: string) => void;
    onSend: () => void;
    onTyping: () => void;
    onEditMessage: (messageId: string, content: string) => Promise<void>;
    onDeleteMessage: (messageId: string) => Promise<void>;
}

export function DmChatArea({
    conversation,
    messages,
    messagesLoading,
    sending,
    messageText,
    messagesEndRef,
    typingUsers,
    onMessageChange,
    onSend,
    onTyping,
    onEditMessage,
    onDeleteMessage,
}: DmChatAreaProps) {
    const messageListRef = useRef<HTMLDivElement>(null);
    const currentUser = useAuthStore((s) => s.user);

    // Online status
    const isOtherUserOnline = useOnlineStatus(conversation.otherUser?.id);

    // Edit state
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState("");

    // Context menu
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);

    // Emoji picker
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => messageListRef.current,
        estimateSize: () => 60,
        overscan: 20,
    });

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };

    // Context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
        if (msg.senderId !== currentUser?.id) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
    }, [currentUser?.id]);

    // Edit handlers
    const handleStartEdit = (msg: Message) => {
        setEditingMessage(msg);
        setEditText(msg.content);
        setContextMenu(null);
    };

    const handleSubmitEdit = async () => {
        if (!editingMessage || !editText.trim()) return;
        await onEditMessage(editingMessage.id, editText.trim());
        setEditingMessage(null);
        setEditText("");
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditText("");
    };

    // Delete
    const handleDelete = async (msg: Message) => {
        if (!confirm("Bu mesajı silmek istediğinizden emin misiniz?")) return;
        setContextMenu(null);
        await onDeleteMessage(msg.id);
    };

    // Input with typing
    const handleInputChange = (value: string) => {
        onMessageChange(value);
        onTyping();
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#050505]/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full"
                            style={{
                                backgroundImage: conversation.otherUser
                                    ? `linear-gradient(135deg, ${conversation.otherUser.avatarGradient[0]}, ${conversation.otherUser.avatarGradient[1]})`
                                    : "linear-gradient(135deg, #333, #666)",
                            }}
                        />
                        {isOtherUserOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-[#050505]" />
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-zinc-100">
                            {conversation.otherUser?.displayName || "Unknown"}
                        </div>
                        <div className={`text-xs ${isOtherUserOnline ? "text-green-400" : "text-zinc-500"}`}>
                            {isOtherUserOnline ? "Çevrimiçi" : "Çevrimdışı"}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messageListRef}
                className="flex-1 overflow-y-auto p-4"
                onClick={() => setContextMenu(null)}
            >
                {messagesLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <div className="text-5xl mb-4">👋</div>
                        <p className="font-medium">Henüz mesaj yok</p>
                        <p className="text-sm mt-1">{conversation.otherUser?.displayName} ile konuşmaya başla!</p>
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative",
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const msg = messages[virtualItem.index];
                            const isOwn = msg.senderId === currentUser?.id;
                            const isEditing = editingMessage?.id === msg.id;

                            return (
                                <div
                                    key={virtualItem.key}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    className="absolute top-0 left-0 w-full pb-2"
                                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                                >
                                    <div
                                        className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}
                                        onContextMenu={(e) => handleContextMenu(e, msg)}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full shrink-0"
                                            style={{
                                                backgroundImage:
                                                    msg.sender?.avatarGradient?.length === 2
                                                        ? `linear-gradient(135deg, ${msg.sender.avatarGradient[0]}, ${msg.sender.avatarGradient[1]})`
                                                        : "linear-gradient(135deg, #333, #666)",
                                            }}
                                        />
                                        <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                                            <div className={`flex items-baseline gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                                                <span className="text-sm font-medium text-zinc-300">
                                                    {isOwn ? "Sen" : msg.sender?.displayName || "Unknown"}
                                                </span>
                                                <span className="text-xs text-zinc-500">{formatTime(msg.createdAt)}</span>
                                                {msg.isEdited && <span className="text-xs text-zinc-600">(düzenlendi)</span>}
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
                                                    <button onClick={handleSubmitEdit} className="text-green-400 hover:text-green-300">✓</button>
                                                    <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300">✕</button>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`px-4 py-2 rounded-2xl mt-1 ${isOwn
                                                            ? "bg-purple-600 text-white rounded-tr-md"
                                                            : "bg-white/10 text-zinc-100 rounded-tl-md"
                                                        }`}
                                                >
                                                    <p className="break-words">{msg.content}</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Quick actions */}
                                        {isOwn && !isEditing && (
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                                <button onClick={() => handleStartEdit(msg)} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 rounded" title="Düzenle">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => handleDelete(msg)} className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded" title="Sil">
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
                <div ref={messagesEndRef} style={{ position: "relative", top: messages.length > 0 ? `${virtualizer.getTotalSize()}px` : 0 }} />
            </div>

            {/* Typing indicator */}
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
            <div className="p-4 shrink-0 border-t border-white/10 bg-[#050505]/60 backdrop-blur-md">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <button className="text-zinc-400 hover:text-zinc-300" title="Dosya Ekle">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
                        placeholder={`${conversation.otherUser?.displayName || "Kullanıcı"} kullanıcısına mesaj gönder`}
                        disabled={sending}
                        className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none disabled:opacity-50"
                        autoComplete="off"
                    />
                    <div className="flex items-center gap-2 text-zinc-400 relative">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`hover:text-zinc-300 ${showEmojiPicker ? "text-purple-400" : ""}`}
                        >
                            <span className="text-lg">😊</span>
                        </button>
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
                        Düzenle
                    </button>
                    <button
                        onClick={() => handleDelete(contextMenu.message)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                    >
                        Sil
                    </button>
                </div>
            )}
        </div>
    );
}
