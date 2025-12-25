import { ChatView } from '../ChatView';
import type { Channel, ChannelMessage } from '../../../../api/types';
import { useMemo } from 'react';

// SVG Icons
const HashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
);

interface ServerChatAreaProps {
    selectedChannel: Channel | undefined;
    messages: ChannelMessage[];
    loadingMessages: boolean;
    onSendMessage: (content: string) => Promise<void>;
}

export function ServerChatArea({ selectedChannel, messages, loadingMessages, onSendMessage }: ServerChatAreaProps) {
    const chatMessages = useMemo(() => {
        if (!selectedChannel) return [];
        return messages.map((m) => ({
            id: m.id,
            conversationId: selectedChannel.id,
            senderId: m.authorId,
            content: m.content,
            isEdited: m.isEdited,
            createdAt: m.createdAt,
            sender: m.author
                ? {
                    id: m.author.id,
                    handle: m.author.handle,
                    displayName: m.author.displayName,
                    avatarGradient: m.author.avatarGradient,
                }
                : undefined,
        }));
    }, [messages, selectedChannel]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Channel Header */}
            <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <HashIcon className="w-5 h-5 text-zinc-500" />
                <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                    {selectedChannel?.name || 'Kanal seçin'}
                </span>
                {selectedChannel?.description && (
                    <>
                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.4)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {selectedChannel.description}
                        </span>
                    </>
                )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '0 12px 12px', overflow: 'hidden' }}>
                {selectedChannel ? (
                    <ChatView
                        messages={chatMessages}
                        loading={loadingMessages}
                        onSendMessage={onSendMessage}
                        placeholder={`#${selectedChannel?.name} kanalına mesaj gönder`}
                        emptyMessage="Bu kanalda henüz mesaj yok. İlk mesajı sen gönder!"
                    />
                ) : (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        opacity: 0.5
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <HashIcon className="w-8 h-8 mx-auto mb-3 text-zinc-500" />
                            <div>Bir kanal seçin</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
