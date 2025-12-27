import { useState, useCallback, useMemo } from "react";
import type { ChannelMessage, Channel } from "../../../../api/types";
import { useAuthStore } from "../../../../store/authStore";
import { useVoiceStore } from "../../../../store/voiceStore";
import {
    ChatHeader,
    MessageList,
    TypingIndicator,
    MessageContextMenu,
} from "../chat";
import { UsersIcon } from "./HybridIcons";
import { VoiceVideoPanel } from "./VoiceVideoPanel";
import { HybridControlBar } from "./HybridControlBar";

interface HybridChatAreaProps {
    channel: Channel;
    messages: ChannelMessage[];
    messagesLoading: boolean;
    sending: boolean;
    messageText: string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onMessageChange: (text: string) => void;
    onSend: () => void;
    onEditMessage?: (messageId: string, content: string) => Promise<void>;
    onDeleteMessage?: (messageId: string) => Promise<void>;
    onTyping?: () => void;
    typingUsers?: { userId: string; handle?: string; displayName?: string }[];
    canSend?: boolean; // Permission to send messages
}

export function HybridChatArea({
    channel,
    messages,
    messagesLoading,
    sending,
    messageText,
    messagesEndRef,
    onMessageChange,
    onSend,
    onEditMessage,
    onDeleteMessage,
    onTyping,
    typingUsers = [],
    canSend = true,
}: HybridChatAreaProps) {
    const currentUser = useAuthStore((s) => s.user);
    const voiceStore = useVoiceStore();

    // Panel visibility
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        message: ChannelMessage;
    } | null>(null);

    // Edit state
    const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null);
    const [editText, setEditText] = useState("");

    // Check if connected to this channel
    const isConnectedToThis = useMemo(() => {
        return voiceStore.activeChannel?.id === channel.id && voiceStore.isConnected;
    }, [voiceStore.activeChannel?.id, voiceStore.isConnected, channel.id]);

    const isConnectingToThis = useMemo(() => {
        return voiceStore.activeChannel?.id === channel.id && voiceStore.isConnecting;
    }, [voiceStore.activeChannel?.id, voiceStore.isConnecting, channel.id]);

    // Voice control handlers
    const handleConnect = useCallback(() => {
        voiceStore.connect({
            id: channel.id,
            name: channel.name,
            serverId: channel.serverId || "",
            type: "hybrid",
            position: 0,
            userLimit: 0,
            participantCount: 0,
            createdAt: "",
        });
    }, [channel, voiceStore]);

    const handleDisconnect = useCallback(() => {
        voiceStore.disconnect();
    }, [voiceStore]);

    const handleToggleMute = useCallback(() => {
        voiceStore.toggleMute();
    }, [voiceStore]);

    const handleToggleDeafen = useCallback(() => {
        voiceStore.toggleDeafen();
    }, [voiceStore]);

    const handleToggleVideo = useCallback(() => {
        voiceStore.toggleCamera();
    }, [voiceStore]);

    // Participants from voice store
    const participants = useMemo(() => {
        if (!isConnectedToThis) return [];
        return voiceStore.participants.map((p) => ({
            id: p.identity,
            name: p.identity, // Use identity as display name fallback
            avatarGradient: undefined as [string, string] | undefined,
            isSpeaking: p.isSpeaking,
            isMuted: p.isMuted,
            hasVideo: p.isCameraOn,
        }));
    }, [isConnectedToThis, voiceStore.participants]);

    // Context menu handlers
    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, message: ChannelMessage) => {
            if (message.authorId !== currentUser?.id) return;
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, message });
        },
        [currentUser?.id]
    );

    const handleStartEdit = useCallback((message: ChannelMessage) => {
        setEditingMessage(message);
        setEditText(message.content);
        setContextMenu(null);
    }, []);

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

    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
        setEditText("");
    }, []);

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

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <ChatHeader channel={channel} variant="full" />

            {/* Content Area */}
            <div className="flex-1 flex min-h-0">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-h-0" onClick={handleCloseContextMenu}>
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
                        variant="full"
                    />
                </div>

                {/* Voice/Video Panel */}
                {isPanelOpen && (
                    <VoiceVideoPanel
                        isConnected={isConnectedToThis}
                        isConnecting={isConnectingToThis}
                        participants={participants}
                        onCollapse={() => setIsPanelOpen(false)}
                    />
                )}
            </div>

            {/* Typing Indicator */}
            <TypingIndicator users={typingUsers} />

            {/* Control Bar */}
            <HybridControlBar
                messageText={messageText}
                onMessageChange={onMessageChange}
                onSend={onSend}
                sending={sending}
                channelName={channel.name}
                onTyping={onTyping}
                canSend={canSend}
                isConnected={isConnectedToThis}
                isConnecting={isConnectingToThis}
                isMuted={voiceStore.isMuted}
                isDeafened={voiceStore.isDeafened}
                isVideoEnabled={voiceStore.isCameraOn}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onToggleMute={handleToggleMute}
                onToggleDeafen={handleToggleDeafen}
                onToggleVideo={handleToggleVideo}
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

            {/* Panel Toggle (when collapsed) */}
            {!isPanelOpen && (
                <button
                    onClick={() => setIsPanelOpen(true)}
                    className="fixed right-4 top-1/2 -translate-y-1/2 p-2 bg-[#1a1a22] border border-white/10 rounded-lg shadow-lg hover:bg-white/10 transition-colors z-10"
                    title="Katılımcı panelini aç"
                >
                    <UsersIcon className="w-5 h-5 text-zinc-400" />
                    {participants.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                            {participants.length}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}
