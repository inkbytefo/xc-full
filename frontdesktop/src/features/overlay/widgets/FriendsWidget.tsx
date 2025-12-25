import { useState, useEffect } from 'react';
import { fetchConversations } from '../../dm/dmApi';
import { BaseWidget } from './BaseWidget';
import { subscribeToEvent, useWebSocketStore } from '../../../lib/websocket/store';

interface Friend {
    id: string;
    name: string;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    imageUrl?: string;
    activity?: string;
}

export function FriendsWidget() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const onlineUsers = useWebSocketStore((s) => s.onlineUsers);

    useEffect(() => {
        const loadFriends = async () => {
            try {
                const conversations = await fetchConversations();
                const mappedFriends: Friend[] = conversations
                    .filter(c => c.otherUser) // Ensure otherUser exists
                    .map(c => ({
                        id: c.otherUser!.id,
                        name: c.otherUser!.displayName || c.otherUser!.handle,
                        status: 'offline',
                        // Use gradient or avatar if available (mocking avatar for now if missing)
                        activity: c.lastMessage?.content || 'No activity',
                    }));
                setFriends(mappedFriends);
            } catch (err) {
                console.error('Failed to load friends', err);
            } finally {
                setLoading(false);
            }
        };

        loadFriends();

        const offDm = subscribeToEvent('dm_message', () => {
            loadFriends();
        });

        return () => {
            offDm();
        };
    }, []);

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase();
    };

    const resolvedFriends = friends.map((f) => ({
        ...f,
        status: onlineUsers.has(f.id) ? 'online' : 'offline',
    }));

    const onlineFriends = resolvedFriends.filter((f) => f.status !== 'offline');
    const offlineFriends = resolvedFriends.filter((f) => f.status === 'offline');

    const headerActions = (
        <span style={{ color: '#22c55e', fontSize: '12px' }}>
            {onlineFriends.length} çevrimiçi
        </span>
    );

    return (
        <BaseWidget
            id="friends"
            title="Arkadaşlar"
            icon="👥"
            defaultPosition={{ x: 50, y: 150 }}
            defaultSize={{ width: 320, height: 450 }}
            headerActions={headerActions}
        >
            {/* Online friends */}
            {onlineFriends.map((friend) => (
                <div key={friend.id} className="friend-item">
                    <div className="friend-avatar">
                        {getInitials(friend.name)}
                        <div className={`friend-status ${friend.status}`} />
                    </div>
                    <div className="friend-info">
                        <div className="friend-name">{friend.name}</div>
                        {friend.activity && (
                            <div className="friend-activity" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                {friend.activity}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Offline section */}
            {offlineFriends.length > 0 && (
                <>
                    <div
                        style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.4)',
                            padding: '12px 8px 4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}
                    >
                        Çevrimdışı — {offlineFriends.length}
                    </div>
                    {offlineFriends.map((friend) => (
                        <div key={friend.id} className="friend-item" style={{ opacity: 0.5 }}>
                            <div className="friend-avatar">
                                {getInitials(friend.name)}
                                <div className={`friend-status ${friend.status}`} />
                            </div>
                            <div className="friend-info">
                                <div className="friend-name">{friend.name}</div>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {friends.length === 0 && !loading && (
                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                    Henüz arkadaşın yok.
                </div>
            )}
        </BaseWidget>
    );
}
