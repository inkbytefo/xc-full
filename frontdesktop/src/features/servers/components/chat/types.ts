// ============================================================================
// Chat Component Types
// ============================================================================

import type { ChannelMessage, Channel } from "../../../../api/types";

// ============================================================================
// Shared Types
// ============================================================================

export interface ChatVariant {
    variant?: "full" | "panel";
}

// ============================================================================
// ChatHeader
// ============================================================================

export interface ChatHeaderProps extends ChatVariant {
    channel: Channel;
    headerIcon?: React.ReactNode;
    headerBadge?: React.ReactNode;
}

// ============================================================================
// MessageList
// ============================================================================

export interface MessageListProps extends ChatVariant {
    messages: ChannelMessage[];
    loading: boolean;
    channelName: string;
    currentUserId?: string;
    editingMessageId?: string | null;
    editText: string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onContextMenu: (e: React.MouseEvent, message: ChannelMessage) => void;
    onStartEdit: (message: ChannelMessage) => void;
    onSubmitEdit: () => void;
    onCancelEdit: () => void;
    onDelete: (message: ChannelMessage) => void;
    onEditTextChange: (text: string) => void;
    showEditActions?: boolean;
}

// ============================================================================
// MessageItem
// ============================================================================

export interface MessageItemProps {
    message: ChannelMessage;
    isOwn: boolean;
    isEditing: boolean;
    editText: string;
    onEditTextChange: (text: string) => void;
    onSubmitEdit: () => void;
    onCancelEdit: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onStartEdit: () => void;
    onDelete: () => void;
    showActions?: boolean;
}

// ============================================================================
// MessageInput
// ============================================================================

export interface MessageInputProps extends ChatVariant {
    value: string;
    onChange: (text: string) => void;
    onSend: () => void;
    placeholder: string;
    disabled?: boolean;
    readOnly?: boolean;
    readOnlyMessage?: string;
}

// ============================================================================
// TypingIndicator
// ============================================================================

export interface TypingIndicatorProps {
    users: { userId: string; handle?: string; displayName?: string }[];
}

// ============================================================================
// MessageContextMenu
// ============================================================================

export interface MessageContextMenuProps {
    x: number;
    y: number;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}
