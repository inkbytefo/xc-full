// ============================================================================
// ChatArea - Refactored Server Chat Component
// ============================================================================
// This component uses modular chat components for better maintainability.

import { useState, useCallback } from "react";
import type { ChannelMessage, Channel } from "../../../../api/types";
import { useAuthStore } from "../../../../store/authStore";
import {
    ChatHeader,
    MessageList,
    MessageInput,
    TypingIndicator,
    MessageContextMenu,
} from "../chat";

interface ChatAreaProps {
    channel: Channel;
    messages: ChannelMessage[];
    messagesLoading: boolean;
    sending: boolean;
    messageText: string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onMessageChange: (text: string) => void;
    onSend: () => void;
    variant?: "full" | "panel";
    headerIcon?: React.ReactNode;
    headerBadge?: React.ReactNode;
    onEditMessage?: (messageId: string, content: string) => Promise<void>;
    onDeleteMessage?: (messageId: string) => Promise<void>;
    onTyping?: () => void;
    typingUsers?: { userId: string; handle?: string; displayName?: string }[];
    canSend?: boolean; // Permission to send messages in this channel
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
    canSend = true, // Default to true for backward compatibility
}: ChatAreaProps) {
    const currentUser = useAuthStore((s) => s.user);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        message: ChannelMessage;
    } | null>(null);

    // Edit state
    const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null);
    const [editText, setEditText] = useState("");

    // Close context menu on click
    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Handle message context menu
    const handleContextMenu = useCallback(
        (e: React.MouseEvent, message: ChannelMessage) => {
            if (message.authorId !== currentUser?.id) return;
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, message });
        },
        [currentUser?.id]
    );

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
    const handleDelete = useCallback(
        async (message: ChannelMessage) => {
            if (!onDeleteMessage) return;
            if (!confirm("Bu mesajı silmek istediğinizden emin misiniz?")) return;

            setContextMenu(null);
            try {
                await onDeleteMessage(message.id);
            } catch (e) {
                console.error("Delete failed:", e);
            }
        },
        [onDeleteMessage]
    );

    // Handle input change with typing indicator
    const handleInputChange = useCallback(
        (value: string) => {
            onMessageChange(value);
            onTyping?.();
        },
        [onMessageChange, onTyping]
    );

    return (
        <>
            {/* Channel Header */}
            <ChatHeader
                channel={channel}
                variant={variant}
                headerIcon={headerIcon}
                headerBadge={headerBadge}
            />

            {/* Messages */}
            <div onClick={handleCloseContextMenu} className="flex-1 flex flex-col min-h-0">
                <MessageList
                    messages={messages}
                    loading={messagesLoading}
                    channelName={channel.name}
                    currentUserId={currentUser?.id}
                    editingMessageId={editingMessage?.id}
                    editText={editText}
                    messagesEndRef={messagesEndRef}
                    onContextMenu={handleContextMenu}
                    onStartEdit={handleStartEdit}
                    onSubmitEdit={handleSubmitEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={handleDelete}
                    onEditTextChange={setEditText}
                    showEditActions={!!(onEditMessage && onDeleteMessage)}
                    variant={variant}
                />
            </div>

            {/* Typing Indicator */}
            <TypingIndicator users={typingUsers} />

            {/* Input */}
            <MessageInput
                value={messageText}
                onChange={handleInputChange}
                onSend={onSend}
                placeholder={`Message #${channel.name}`}
                disabled={sending}
                variant={variant}
                readOnly={!canSend}
                readOnlyMessage={
                    channel.type === "announcement"
                        ? "Bu bir duyuru kanalıdır. Sadece yöneticiler mesaj gönderebilir."
                        : "Bu kanala mesaj gönderme izniniz yok."
                }
            />

            {/* Context Menu */}
            {contextMenu && (
                <MessageContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={() => handleStartEdit(contextMenu.message)}
                    onDelete={() => handleDelete(contextMenu.message)}
                    onClose={handleCloseContextMenu}
                />
            )}
        </>
    );
}
