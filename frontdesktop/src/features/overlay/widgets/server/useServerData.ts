import { useState, useEffect } from 'react';
import { fetchServers, fetchChannels, fetchChannelMessages, sendChannelMessage } from '../../../servers/serversApi';
import type { Server, Channel, ChannelMessage } from '../../../../api/types';
import { subscribeToEvent, useWebSocketStore } from '../../../../lib/websocket/store';
import type { ChannelMessageEventData } from '../../../../lib/websocket/types';

export function useServerData() {
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingServers, setLoadingServers] = useState(true);

    // Initial load: Fetch Servers
    useEffect(() => {
        const loadServers = async () => {
            setLoadingServers(true);
            try {
                const data = await fetchServers();
                setServers(data);
                if (data.length > 0) {
                    setSelectedServerId(data[0].id);
                }
            } catch (e) {
                console.error("Failed to load servers", e);
            } finally {
                setLoadingServers(false);
            }
        };
        loadServers();
    }, []);

    // When Server changes -> Fetch Channels
    useEffect(() => {
        if (!selectedServerId) return;

        const loadChannels = async () => {
            try {
                const data = await fetchChannels(selectedServerId);
                setChannels(data);
                const firstText = data.find(c => c.type === 'text');
                if (firstText) {
                    setSelectedChannelId(firstText.id);
                } else {
                    setSelectedChannelId(null);
                }
            } catch (e) {
                console.error("Failed to load channels", e);
            }
        };
        loadChannels();
    }, [selectedServerId]);

    // When Channel changes -> Fetch Messages
    useEffect(() => {
        if (!selectedServerId || !selectedChannelId) {
            setMessages([]);
            return;
        }

        let cancelled = false;
        let refreshTimeout: number | null = null;

        const loadMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await fetchChannelMessages(selectedServerId, selectedChannelId);
                if (!cancelled) {
                    setMessages(res.data);
                }
            } catch (e) {
                console.error("Failed to load messages", e);
            } finally {
                if (!cancelled) {
                    setLoadingMessages(false);
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

        const ws = useWebSocketStore.getState();
        ws.subscribeToChannel(selectedChannelId);

        const offNew = subscribeToEvent('channel_message', (data) => {
            const evt = data as ChannelMessageEventData;
            if (evt.channelId === selectedChannelId) {
                scheduleRefresh();
            }
        });
        const offEdit = subscribeToEvent('channel_message_edited', (data) => {
            const evt = data as ChannelMessageEventData;
            if (evt.channelId === selectedChannelId) {
                scheduleRefresh();
            }
        });
        const offDelete = subscribeToEvent('channel_message_deleted', (data) => {
            const evt = data as ChannelMessageEventData;
            if (evt.channelId === selectedChannelId) {
                scheduleRefresh();
            }
        });

        return () => {
            cancelled = true;
            if (refreshTimeout !== null) {
                window.clearTimeout(refreshTimeout);
            }
            ws.unsubscribeFromChannel(selectedChannelId);
            offNew();
            offEdit();
            offDelete();
        };

    }, [selectedServerId, selectedChannelId]);

    const handleSendMessage = async (content: string) => {
        if (!selectedServerId || !selectedChannelId) return;
        try {
            await sendChannelMessage(selectedServerId, selectedChannelId, content);
            const res = await fetchChannelMessages(selectedServerId, selectedChannelId);
            setMessages(res.data);
        } catch (e) {
            console.error("Failed to send", e);
        }
    };

    return {
        servers,
        selectedServerId,
        setSelectedServerId,
        channels,
        selectedChannelId,
        setSelectedChannelId,
        messages,
        loadingMessages,
        loadingServers,
        handleSendMessage,
        selectedServer: servers.find(s => s.id === selectedServerId),
        selectedChannel: channels.find(c => c.id === selectedChannelId),
    };
}
