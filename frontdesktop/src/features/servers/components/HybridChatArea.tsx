// ============================================================================
// HybridChatArea - Combined Text + Voice + Video Channel View
// ============================================================================
// Discord-style hybrid channel with chat on left, voice/video panel on right.
// Responsive design: stacked on mobile, split on desktop.

import { useState, useCallback, useMemo } from "react";
import type { ChannelMessage, Channel } from "../../../api/types";
import { useAuthStore } from "../../../store/authStore";
import { useVoiceStore } from "../../../store/voiceStore";
import {
    ChatHeader,
    MessageList,
    TypingIndicator,
    MessageContextMenu,
} from "./chat";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Icons
// ============================================================================

function MicIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
    );
}

function MicOffIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
    );
}

function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );
}

function VideoOffIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
    );
}

function HeadphonesIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
    );
}

function PhoneIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    );
}

function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function ChevronRightIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

// ============================================================================
// VoiceVideoPanel - Right side panel for voice/video
// ============================================================================

interface VoiceVideoPanelProps {
    isConnected: boolean;
    isConnecting: boolean;
    participants: Array<{
        id: string;
        name: string;
        avatarGradient?: [string, string];
        isSpeaking?: boolean;
        isMuted?: boolean;
        hasVideo?: boolean;
    }>;
    onCollapse: () => void;
}

function VoiceVideoPanel({ isConnected, isConnecting, participants, onCollapse }: VoiceVideoPanelProps) {
    return (
        <div className="w-64 lg:w-80 flex flex-col border-l border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
            {/* Panel Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-300">
                        Katılımcılar ({participants.length})
                    </span>
                </div>
                <button
                    onClick={onCollapse}
                    className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Status */}
            {isConnecting && (
                <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-sm text-yellow-400">Bağlanıyor...</span>
                    </div>
                </div>
            )}

            {isConnected && (
                <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-400">Sesli Sohbette</span>
                    </div>
                </div>
            )}

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto p-2">
                {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <UsersIcon className="w-8 h-8 text-zinc-600 mb-2" />
                        <p className="text-sm text-zinc-500">Henüz kimse yok</p>
                        <p className="text-xs text-zinc-600">Sesli sohbete katıl!</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {participants.map((participant) => (
                            <div
                                key={participant.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${participant.isSpeaking ? "bg-green-500/10 ring-1 ring-green-500/30" : "hover:bg-white/5"
                                    }`}
                            >
                                {/* Avatar */}
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                                    style={{
                                        background: participant.avatarGradient
                                            ? `linear-gradient(135deg, ${participant.avatarGradient[0]}, ${participant.avatarGradient[1]})`
                                            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    }}
                                >
                                    {participant.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm text-zinc-200 truncate block">
                                        {participant.name}
                                    </span>
                                </div>

                                {/* Status Icons */}
                                <div className="flex items-center gap-1">
                                    {participant.isSpeaking && (
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        </div>
                                    )}
                                    {participant.isMuted && (
                                        <MicOffIcon className="w-4 h-4 text-red-400" />
                                    )}
                                    {participant.hasVideo && (
                                        <VideoIcon className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// HybridControlBar - Bottom bar with message input + voice controls
// ============================================================================

interface HybridControlBarProps {
    // Message input
    messageText: string;
    onMessageChange: (text: string) => void;
    onSend: () => void;
    sending: boolean;
    channelName: string;
    onTyping?: () => void;
    canSend?: boolean; // Permission to send messages

    // Voice controls
    isConnected: boolean;
    isConnecting: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    isVideoEnabled: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onToggleVideo: () => void;
}

function HybridControlBar({
    messageText,
    onMessageChange,
    onSend,
    sending,
    channelName,
    onTyping,
    canSend = true,
    isConnected,
    isConnecting,
    isMuted,
    isDeafened,
    isVideoEnabled,
    onConnect,
    onDisconnect,
    onToggleMute,
    onToggleDeafen,
    onToggleVideo,
}: HybridControlBarProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (messageText.trim() && !sending) {
                onSend();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onMessageChange(e.target.value);
        onTyping?.();
    };

    return (
        <div className="shrink-0 border-t border-white/10 bg-[#0d0d12]/90 backdrop-blur-xl">
            <div className="flex items-end gap-3 p-3">
                {/* Message Input */}
                <div className="flex-1 relative">
                    {canSend ? (
                        <textarea
                            value={messageText}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder={`Mesaj yaz #${channelName}`}
                            disabled={sending}
                            rows={1}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 outline-none resize-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                            style={{ minHeight: "48px", maxHeight: "120px" }}
                        />
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm text-yellow-200/70">Bu kanala mesaj gönderme izniniz yok.</span>
                        </div>
                    )}
                </div>

                {/* Voice Controls */}
                <div className="flex items-center gap-1">
                    {!isConnected && !isConnecting ? (
                        <button
                            onClick={onConnect}
                            className="flex items-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors"
                        >
                            <PhoneIcon className="w-5 h-5" />
                            <span className="text-sm font-medium hidden sm:inline">Katıl</span>
                        </button>
                    ) : (
                        <>
                            {/* Mute */}
                            <button
                                onClick={onToggleMute}
                                disabled={isConnecting}
                                className={`p-3 rounded-xl transition-colors ${isMuted
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                                    } disabled:opacity-50`}
                                title={isMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
                            >
                                {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                            </button>

                            {/* Video */}
                            <button
                                onClick={onToggleVideo}
                                disabled={isConnecting}
                                className={`p-3 rounded-xl transition-colors ${isVideoEnabled
                                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                                    } disabled:opacity-50`}
                                title={isVideoEnabled ? "Kamerayı Kapat" : "Kamerayı Aç"}
                            >
                                {isVideoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOffIcon className="w-5 h-5" />}
                            </button>

                            {/* Deafen */}
                            <button
                                onClick={onToggleDeafen}
                                disabled={isConnecting}
                                className={`p-3 rounded-xl transition-colors ${isDeafened
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                                    } disabled:opacity-50`}
                                title={isDeafened ? "Sesi Aç" : "Sesi Kapat"}
                            >
                                <HeadphonesIcon className="w-5 h-5" />
                            </button>

                            {/* Disconnect */}
                            <button
                                onClick={onDisconnect}
                                disabled={isConnecting}
                                className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                title="Ayrıl"
                            >
                                <PhoneIcon className="w-5 h-5 rotate-[135deg]" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// HybridChatArea - Main Component
// ============================================================================

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
