// ============================================================================
// Server Widget - Overlay Sunucu Görünümü (Refactored)
// ============================================================================

import { BaseWidget } from './BaseWidget';
import { ServerRail } from './server/ServerRail';
import { ChannelSidebar } from './server/ChannelSidebar';
import { ServerChatArea } from './server/ServerChatArea';
import { useServerData } from './server/useServerData';
import { useVoiceStore } from '../../../store/voiceStore';
import { useWidgetStore } from '../stores/widgetStore';

const ServerIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export function ServerWidget() {
    const {
        servers,
        selectedServerId,
        setSelectedServerId,
        channels,
        voiceChannels,
        selectedChannelId,
        setSelectedChannelId,
        messages,
        loadingMessages,
        loadingServers,
        loadingChannels,
        handleSendMessage,
        selectedServer,
        selectedChannel
    } = useServerData();

    const connect = useVoiceStore((s) => s.connect);
    const activeVoiceChannelId = useVoiceStore((s) => s.activeChannelId);
    const openWidget = useWidgetStore((s) => s.openWidget);
    const bringToFront = useWidgetStore((s) => s.bringToFront);

    const CenterState = ({ title, subtitle }: { title: string; subtitle?: string }) => (
        <div style={{
            padding: 32,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            height: '100%',
            justifyContent: 'center'
        }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: subtitle ? undefined : 'pulse 2s infinite'
            }}>
                <ServerIcon className="w-8 h-8 text-zinc-500" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                {title}
            </div>
            {subtitle && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {subtitle}
                </div>
            )}
        </div>
    );

    if (loadingServers) {
        return (
            <BaseWidget id="server" title="Sunucular" icon="🏰">
                <CenterState title="Sunucular yükleniyor..." />
            </BaseWidget>
        );
    }

    // Empty State
    if (servers.length === 0) {
        return (
            <BaseWidget id="server" title="Sunucular" icon="🏰">
                <CenterState
                    title="Henüz bir sunucuya üye değilsiniz"
                    subtitle="Ana uygulamadan bir sunucuya katılın"
                />
            </BaseWidget>
        );
    }

    return (
        <BaseWidget
            id="server"
            title={selectedChannel ? `#${selectedChannel.name}` : "Sunucular"}
            icon="🏰"
            defaultPosition={{ x: 400, y: 150 }}
            defaultSize={{ width: 800, height: 600 }}
        >
            <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
                <ServerRail
                    servers={servers}
                    selectedServerId={selectedServerId}
                    onServerSelect={setSelectedServerId}
                />

                <ChannelSidebar
                    server={selectedServer}
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onChannelSelect={setSelectedChannelId}
                    voiceChannels={voiceChannels}
                    activeVoiceChannelId={activeVoiceChannelId}
                    onVoiceChannelJoin={async (channel) => {
                        await connect(channel);
                        openWidget('voice');
                        bringToFront('voice');
                    }}
                />

                {loadingChannels ? (
                    <div style={{ flex: 1 }}>
                        <CenterState title="Kanallar yükleniyor..." />
                    </div>
                ) : (
                    <ServerChatArea
                        selectedChannel={selectedChannel}
                        messages={messages}
                        loadingMessages={loadingMessages}
                        onSendMessage={handleSendMessage}
                    />
                )}
            </div>
        </BaseWidget>
    );
}

