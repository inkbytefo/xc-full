// ============================================================================
// ConversationList - DM Conversations Sidebar
// ============================================================================

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Conversation } from "../../../api/types";

interface ConversationListProps {
    conversations: Conversation[];
    loading: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNewConversation: () => void;
}

export function ConversationList({
    conversations,
    loading,
    selectedId,
    onSelect,
    onNewConversation,
}: ConversationListProps) {
    const listRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: conversations.length,
        getScrollElement: () => listRef.current,
        estimateSize: () => 88,
        overscan: 10,
    });

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="w-80 border-r border-white/10 bg-[#050505]/60 backdrop-blur-md flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-100">Mesajlar</h2>
                <button
                    onClick={onNewConversation}
                    className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    title="Yeni Mesaj"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/5">
                <input
                    type="text"
                    placeholder="Konuşmalarda ara..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm outline-none focus:border-purple-500/50"
                />
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="text-zinc-400 font-medium">Henüz mesaj yok</p>
                        <p className="text-zinc-500 text-sm mt-1">Yeni bir konuşma başlatın</p>
                        <button
                            onClick={onNewConversation}
                            className="mt-4 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                        >
                            Mesaj Başlat
                        </button>
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
                            const convo = conversations[virtualItem.index];
                            return (
                                <div
                                    key={convo.id}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    className="absolute top-0 left-0 w-full"
                                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                                >
                                    <button
                                        onClick={() => onSelect(convo.id)}
                                        className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-l-2 ${selectedId === convo.id
                                                ? "bg-white/10 border-purple-500"
                                                : "border-transparent"
                                            }`}
                                    >
                                        <div className="relative">
                                            <div
                                                className="w-12 h-12 rounded-full ring-2 ring-white/10"
                                                style={{
                                                    backgroundImage: convo.otherUser
                                                        ? `linear-gradient(135deg, ${convo.otherUser.avatarGradient[0]}, ${convo.otherUser.avatarGradient[1]})`
                                                        : "linear-gradient(135deg, #333, #666)",
                                                }}
                                            />
                                            {convo.otherUser?.isOnline && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-[#050505]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-zinc-100 truncate">
                                                    {convo.otherUser?.displayName || "Unknown"}
                                                </span>
                                                {convo.lastMessage && (
                                                    <span className="text-xs text-zinc-500">
                                                        {formatTime(convo.updatedAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-500 truncate">
                                                {convo.lastMessage?.content || "Mesaj yok"}
                                            </p>
                                        </div>
                                        {convo.unreadCount > 0 && (
                                            <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-medium">
                                                {convo.unreadCount > 9 ? "9+" : convo.unreadCount}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
