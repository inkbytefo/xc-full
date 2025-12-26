// ============================================================================
// Chat Widget - Overlay Chat Component
// Shows active chat (DM or Channel) from global activeChatStore
// ============================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchMessages, sendMessage } from '../../dm/dmApi';
import { fetchChannelMessages, sendChannelMessage } from '../../servers/serversApi';
import type { Message, ChannelMessage } from '../../../api/types';
import { BaseWidget } from './BaseWidget';
import { ChatView, ChatViewHandle } from './ChatView';
import { subscribeToEvent, useWebSocketStore } from '../../../lib/websocket/store';
import type { DMMessageEventData, ChannelMessageEventData } from '../../../lib/websocket/types';
import { useActiveChatStore } from '../stores/activeChatStore';
import { useWidgetStore } from '../stores/widgetStore';

// SVG Icons
const CloseIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export function ChatWidget() {
    const { activeChat, closeChat } = useActiveChatStore();
    const closeWidget = useWidgetStore((s) => s.closeWidget);
    const widgets = useWidgetStore((s) => s.widgets);

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [quickChatMode, setQuickChatMode] = useState(false);
    const chatViewRef = useRef<ChatViewHandle>(null);

    // Close widget if no active chat
    useEffect(() => {
        if (!activeChat && widgets['chat']?.isOpen) {
            closeWidget('chat');
        }
    }, [activeChat, widgets, closeWidget]);

    // Listen for quick chat activation
    useEffect(() => {
        const handleQuickChatActivated = () => {
            if (activeChat) {
                setQuickChatMode(true);
            }
        };

        const handleQuickChatDeactivated = () => {
            setQuickChatMode(false);
        };

        window.addEventListener('quickChatActivated', handleQuickChatActivated);
        window.addEventListener('quickChatDeactivated', handleQuickChatDeactivated);

        return () => {
            window.removeEventListener('quickChatActivated', handleQuickChatActivated);
            window.removeEventListener('quickChatDeactivated', handleQuickChatDeactivated);
        };
    }, [activeChat]);

    // Load messages based on active chat type
    useEffect(() => {
        if (!activeChat) {
            setMessages([]);
            return;
        }

        let cancelled = false;
        let refreshTimeout: number | null = null;
        const ws = useWebSocketStore.getState();

        const loadMessages = async () => {
            setLoading(true);
            try {
                if (activeChat.type === 'dm') {
                    const res = await fetchMessages(activeChat.conversationId);
                    if (!cancelled) {
                        setMessages(res.data.reverse());
                    }
                } else {
                    const res = await fetchChannelMessages(activeChat.serverId, activeChat.channelId);
                    if (!cancelled) {
                        // Convert channel messages to common format
                        const converted: Message[] = res.data.map((m: ChannelMessage) => ({
                            id: m.id,
                            conversationId: m.channelId,
                            senderId: m.authorId,
                            content: m.content,
                            isEdited: m.isEdited,
                            createdAt: m.createdAt,
                            sender: m.author ? {
                                id: m.author.id,
                                handle: m.author.handle,
                                displayName: m.author.displayName,
                                avatarGradient: m.author.avatarGradient,
                            } : undefined,
                        }));
                        setMessages(converted.reverse());
                    }
                }
            } catch (e) {
                console.error('Failed to load messages:', e);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadMessages();

        const scheduleRefresh = () => {
            if (refreshTimeout !== null) return;
            refreshTimeout = window.setTimeout(() => {
                refreshTimeout = null;
                loadMessages();
            }, 100);
        };

        // Subscribe to WebSocket events
        if (activeChat.type === 'dm') {
            ws.subscribeToConversation(activeChat.conversationId);

            const offNew = subscribeToEvent('dm_message', (data) => {
                const evt = data as DMMessageEventData;
                if (evt.conversationId === activeChat.conversationId) {
                    scheduleRefresh();
                }
            });
            const offEdit = subscribeToEvent('dm_message_edited', (data) => {
                const evt = data as DMMessageEventData;
                if (evt.conversationId === activeChat.conversationId) {
                    scheduleRefresh();
                }
            });
            const offDelete = subscribeToEvent('dm_message_deleted', (data) => {
                const evt = data as DMMessageEventData;
                if (evt.conversationId === activeChat.conversationId) {
                    scheduleRefresh();
                }
            });

            return () => {
                cancelled = true;
                if (refreshTimeout !== null) {
                    window.clearTimeout(refreshTimeout);
                }
                ws.unsubscribeFromConversation(activeChat.conversationId);
                offNew();
                offEdit();
                offDelete();
            };
        } else {
            ws.subscribeToChannel(activeChat.channelId);

            const offNew = subscribeToEvent('channel_message', (data) => {
                const evt = data as ChannelMessageEventData;
                if (evt.channelId === activeChat.channelId && evt.serverId === activeChat.serverId) {
                    scheduleRefresh();
                }
            });
            const offEdit = subscribeToEvent('channel_message_edited', (data) => {
                const evt = data as ChannelMessageEventData;
                if (evt.channelId === activeChat.channelId && evt.serverId === activeChat.serverId) {
                    scheduleRefresh();
                }
            });
            const offDelete = subscribeToEvent('channel_message_deleted', (data) => {
                const evt = data as ChannelMessageEventData;
                if (evt.channelId === activeChat.channelId && evt.serverId === activeChat.serverId) {
                    scheduleRefresh();
                }
            });

            return () => {
                cancelled = true;
                if (refreshTimeout !== null) {
                    window.clearTimeout(refreshTimeout);
                }
                ws.unsubscribeFromChannel(activeChat.channelId);
                offNew();
                offEdit();
                offDelete();
            };
        }
    }, [activeChat]);

    const handleSendMessage = async (content: string) => {
        if (!activeChat) return;

        try {
            if (activeChat.type === 'dm') {
                await sendMessage(activeChat.conversationId, content);
                const res = await fetchMessages(activeChat.conversationId);
                setMessages(res.data.reverse());
            } else {
                await sendChannelMessage(activeChat.serverId, activeChat.channelId, content);
                const res = await fetchChannelMessages(activeChat.serverId, activeChat.channelId);
                const converted: Message[] = res.data.map((m: ChannelMessage) => ({
                    id: m.id,
                    conversationId: m.channelId,
                    senderId: m.authorId,
                    content: m.content,
                    isEdited: m.isEdited,
                    createdAt: m.createdAt,
                    sender: m.author ? {
                        id: m.author.id,
                        handle: m.author.handle,
                        displayName: m.author.displayName,
                        avatarGradient: m.author.avatarGradient,
                    } : undefined,
                }));
                setMessages(converted.reverse());
            }
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    };

    const handleClose = () => {
        closeChat();
        closeWidget('chat');
    };

    // Get title and placeholder based on active chat
    const { title, placeholder } = useMemo(() => {
        if (!activeChat) {
            return { title: 'Sohbet', placeholder: 'Mesaj gönder...' };
        }
        if (activeChat.type === 'dm') {
            return {
                title: activeChat.conversationName,
                placeholder: `@${activeChat.conversationName} kişisine mesaj gönder`
            };
        }
        return {
            title: `#${activeChat.channelName}`,
            placeholder: `#${activeChat.channelName} kanalına mesaj gönder`
        };
    }, [activeChat]);

    // Header actions - close button
    const headerActions = (
        <button
            onClick={handleClose}
            style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                borderRadius: 6,
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                transition: 'all 0.15s ease'
            }}
            title="Sohbeti Kapat"
        >
            <CloseIcon className="w-3 h-3" />
        </button>
    );

    // Don't render if no active chat
    if (!activeChat) {
        return null;
    }

    return (
        <BaseWidget
            id="chat"
            title={title}
            icon={activeChat.type === 'dm' ? '💬' : '#'}
            defaultPosition={{ x: 450, y: 100 }}
            defaultSize={{ width: 400, height: 520 }}
            headerActions={headerActions}
        >
            <div style={{ height: '100%', padding: '0 8px 8px' }}>
                <ChatView
                    ref={chatViewRef}
                    messages={messages}
                    loading={loading}
                    onSendMessage={handleSendMessage}
                    placeholder={placeholder}
                    emptyMessage={activeChat.type === 'dm'
                        ? "Henüz mesaj yok. İlk mesajı gönder!"
                        : "Bu kanalda henüz mesaj yok. İlk mesajı sen gönder!"}
                    quickChatMode={quickChatMode}
                    onQuickChatComplete={() => setQuickChatMode(false)}
                />
            </div>
        </BaseWidget>
    );
}
