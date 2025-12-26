// ============================================================================
// Chat Widget - Overlay DM Chat Component (Refactored)
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { fetchConversations, fetchMessages, sendMessage } from '../../dm/dmApi';
import type { Conversation, Message } from '../../../api/types';
import { BaseWidget } from './BaseWidget';
import { ChatView, ChatViewHandle } from './ChatView';
import { subscribeToEvent, useWebSocketStore } from '../../../lib/websocket/store';
import type { DMMessageEventData } from '../../../lib/websocket/types';

// SVG Icons
const ChevronLeftIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChatIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

export function ChatWidget() {
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [quickChatMode, setQuickChatMode] = useState(false);
    const chatViewRef = useRef<ChatViewHandle>(null);

    // Listen for quick chat activation
    useEffect(() => {
        const handleQuickChatActivated = () => {
            // Only activate if we have an active conversation
            if (view === 'chat' && activeConversation) {
                setQuickChatMode(true);
                // Focus will be handled by ChatView's useEffect
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
    }, [view, activeConversation]);

    // Load Conversations
    useEffect(() => {
        if (view === 'list') {
            loadConversations();
        }
    }, [view]);

    useEffect(() => {
        if (view !== 'list') return;

        let refreshTimeout: number | null = null;
        const scheduleRefresh = () => {
            if (refreshTimeout !== null) return;
            refreshTimeout = window.setTimeout(() => {
                refreshTimeout = null;
                loadConversations();
            }, 100);
        };

        const offNew = subscribeToEvent('dm_message', scheduleRefresh);
        const offEdit = subscribeToEvent('dm_message_edited', scheduleRefresh);
        const offDelete = subscribeToEvent('dm_message_deleted', scheduleRefresh);

        return () => {
            if (refreshTimeout !== null) {
                window.clearTimeout(refreshTimeout);
            }
            offNew();
            offEdit();
            offDelete();
        };
    }, [view]);

    const loadConversations = async () => {
        setLoadingConversations(true);
        try {
            const res = await fetchConversations();
            setConversations(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingConversations(false);
        }
    };

    // Open Chat
    const openChat = async (convo: Conversation) => {
        setActiveConversation(convo);
        setView('chat');
        setLoading(true);

        // Store active conversation info for quick chat
        localStorage.setItem('xc-active-conversation-id', convo.id);
        const otherUserName = convo.otherUser?.displayName || convo.otherUser?.handle || 'User';
        localStorage.setItem('xc-active-conversation-name', otherUserName);

        try {
            const res = await fetchMessages(convo.id);
            setMessages(res.data.reverse());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view !== 'chat' || !activeConversation?.id) return;

        const conversationId = activeConversation.id;
        const ws = useWebSocketStore.getState();
        ws.subscribeToConversation(conversationId);

        let cancelled = false;
        let refreshTimeout: number | null = null;

        const refreshMessages = async () => {
            try {
                const res = await fetchMessages(conversationId);
                if (!cancelled) {
                    setMessages(res.data.reverse());
                }
            } catch (e) {
                console.error(e);
            }
        };

        const scheduleRefresh = () => {
            if (refreshTimeout !== null) return;
            refreshTimeout = window.setTimeout(() => {
                refreshTimeout = null;
                refreshMessages();
            }, 100);
        };

        const offNew = subscribeToEvent('dm_message', (data) => {
            const evt = data as DMMessageEventData;
            if (evt.conversationId === conversationId) {
                scheduleRefresh();
            }
        });
        const offEdit = subscribeToEvent('dm_message_edited', (data) => {
            const evt = data as DMMessageEventData;
            if (evt.conversationId === conversationId) {
                scheduleRefresh();
            }
        });
        const offDelete = subscribeToEvent('dm_message_deleted', (data) => {
            const evt = data as DMMessageEventData;
            if (evt.conversationId === conversationId) {
                scheduleRefresh();
            }
        });

        return () => {
            cancelled = true;
            if (refreshTimeout !== null) {
                window.clearTimeout(refreshTimeout);
            }
            ws.unsubscribeFromConversation(conversationId);
            offNew();
            offEdit();
            offDelete();
        };
    }, [view, activeConversation?.id]);

    const handleSendMessage = async (content: string) => {
        if (!activeConversation) return;

        try {
            await sendMessage(activeConversation.id, content);
            // Refetch messages
            const res = await fetchMessages(activeConversation.id);
            setMessages(res.data.reverse());
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    };

    const getOtherUser = (c: Conversation) => c.otherUser?.displayName || c.otherUser?.handle || 'Unknown';

    const headerActions = view === 'chat' ? (
        <button
            onClick={() => setView('list')}
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
        >
            <ChevronLeftIcon className="w-3 h-3" />
            Geri
        </button>
    ) : undefined;

    const title = view === 'chat' && activeConversation ? getOtherUser(activeConversation) : 'Sohbetler';

    return (
        <BaseWidget
            id="chat"
            title={title}
            icon="💬"
            defaultPosition={{ x: 450, y: 100 }}
            defaultSize={{ width: 370, height: 480 }}
            headerActions={headerActions}
        >
            {/* Conversation List View */}
            {view === 'list' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {loadingConversations ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            opacity: 0.5
                        }}>
                            <ChatIcon className="w-8 h-8" />
                            <span style={{ fontSize: 13 }}>Yükleniyor...</span>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            padding: 24
                        }}>
                            <div style={{
                                width: 64,
                                height: 64,
                                borderRadius: 16,
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <ChatIcon className="w-8 h-8 text-zinc-500" />
                            </div>
                            <div style={{
                                textAlign: 'center',
                                fontSize: 14,
                                color: 'rgba(255,255,255,0.6)'
                            }}>
                                Henüz bir sohbet yok
                            </div>
                            <div style={{
                                textAlign: 'center',
                                fontSize: 12,
                                color: 'rgba(255,255,255,0.4)'
                            }}>
                                Arkadaşlarınızla sohbet başlatın
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
                            {conversations.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => openChat(c)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 12px',
                                        margin: '2px 4px',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease',
                                        background: 'transparent'
                                    }}
                                    className="conversation-item"
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: c.otherUser?.avatarGradient
                                            ? `linear-gradient(135deg, ${c.otherUser.avatarGradient[0]} 0%, ${c.otherUser.avatarGradient[1]} 100%)`
                                            : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        fontSize: 14,
                                        color: '#fff',
                                        flexShrink: 0,
                                        position: 'relative'
                                    }}>
                                        {(c.otherUser?.displayName || '?').substring(0, 2).toUpperCase()}

                                        {/* Online Status */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            border: '2px solid rgba(20, 20, 30, 1)',
                                            background: '#22c55e'
                                        }} />
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: 'rgba(255,255,255,0.9)',
                                            marginBottom: 2
                                        }}>
                                            {getOtherUser(c)}
                                        </div>
                                        <div style={{
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,0.4)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {c.lastMessage?.content || 'Sohbete başlayın'}
                                        </div>
                                    </div>

                                    {/* Unread Badge */}
                                    {c.unreadCount > 0 && (
                                        <div style={{
                                            background: '#ef4444',
                                            borderRadius: 10,
                                            padding: '2px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#fff'
                                        }}>
                                            {c.unreadCount}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Chat View */}
            {view === 'chat' && (
                <div style={{ height: '100%', padding: '0 8px 8px' }}>
                    <ChatView
                        ref={chatViewRef}
                        messages={messages}
                        loading={loading}
                        onSendMessage={handleSendMessage}
                        placeholder={`@${activeConversation?.otherUser?.displayName || 'User'} kişisine mesaj gönder`}
                        emptyMessage="Henüz mesaj yok. İlk mesajı gönder!"
                        quickChatMode={quickChatMode}
                        onQuickChatComplete={() => setQuickChatMode(false)}
                    />
                </div>
            )}
        </BaseWidget>
    );
}
