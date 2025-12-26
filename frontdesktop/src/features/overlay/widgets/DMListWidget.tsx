// ============================================================================
// DM List Widget - Overlay DM Conversation List
// Shows list of DM conversations, selecting one opens the ChatWidget
// ============================================================================

import { useState, useEffect } from 'react';
import { fetchConversations } from '../../dm/dmApi';
import type { Conversation } from '../../../api/types';
import { BaseWidget } from './BaseWidget';
import { subscribeToEvent } from '../../../lib/websocket/store';
import { useActiveChatStore } from '../stores/activeChatStore';
import { useWidgetStore } from '../stores/widgetStore';

// SVG Icons
const ChatIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

export function DMListWidget() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);

    const openDMChat = useActiveChatStore((s) => s.openDMChat);
    const openWidget = useWidgetStore((s) => s.openWidget);
    const closeWidget = useWidgetStore((s) => s.closeWidget);
    const bringToFront = useWidgetStore((s) => s.bringToFront);

    // Load Conversations
    useEffect(() => {
        loadConversations();
    }, []);

    // Subscribe to DM events for real-time updates
    useEffect(() => {
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
    }, []);

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
    const openChat = (convo: Conversation) => {
        const otherUserName = convo.otherUser?.displayName || convo.otherUser?.handle || 'User';

        openDMChat(
            convo.id,
            otherUserName,
            convo.otherUser ? {
                id: convo.otherUser.id,
                handle: convo.otherUser.handle,
                displayName: convo.otherUser.displayName || convo.otherUser.handle,
                avatarGradient: convo.otherUser.avatarGradient,
            } : undefined
        );

        // Open and bring ChatWidget to front
        openWidget('chat');
        bringToFront('chat');

        // Close this widget after selection
        closeWidget('dmList');
    };

    const getOtherUser = (c: Conversation) => c.otherUser?.displayName || c.otherUser?.handle || 'Unknown';

    return (
        <BaseWidget
            id="dmList"
            title="Sohbetler"
            icon="💬"
            defaultPosition={{ x: 100, y: 100 }}
            defaultSize={{ width: 320, height: 420 }}
            pinnable={false}
        >
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
        </BaseWidget>
    );
}
