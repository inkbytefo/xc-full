import { useState, useEffect } from 'react';
import { fetchServers, fetchChannels, fetchChannelMessages, sendChannelMessage } from '../../../servers/serversApi';
import type { Server, Channel, ChannelMessage } from '../../../../api/types';
import { subscribeToEvent, useWebSocketStore } from '../../../../lib/websocket/store';
import type { ChannelMessageEventData } from '../../../../lib/websocket/types';
import { getVoiceChannels } from '../../../media-session/api/serverVoiceApi';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function parseChannelMessage(value: unknown): ChannelMessage | null {
    if (!isRecord(value)) return null;
    if (!isString(value.id)) return null;
    if (!isString(value.channelId)) return null;
    if (!isString(value.serverId)) return null;
    if (!isString(value.authorId)) return null;
    if (!isString(value.content)) return null;
    if (!isString(value.createdAt)) return null;

    const authorValue = value.author;
    let author: ChannelMessage['author'] | undefined;
    if (isRecord(authorValue)) {
        const avatarGradientValue = authorValue.avatarGradient;
        const avatarGradient =
            Array.isArray(avatarGradientValue) &&
                avatarGradientValue.length === 2 &&
                typeof avatarGradientValue[0] === 'string' &&
                typeof avatarGradientValue[1] === 'string'
                ? [avatarGradientValue[0], avatarGradientValue[1]] as [string, string]
                : undefined;

        if (isString(authorValue.id) && isString(authorValue.handle) && isString(authorValue.displayName) && avatarGradient) {
            author = {
                id: authorValue.id,
                handle: authorValue.handle,
                displayName: authorValue.displayName,
                avatarGradient,
            };
        }
    }

    return {
        id: value.id,
        channelId: value.channelId,
        serverId: value.serverId,
        authorId: value.authorId,
        content: value.content,
        isEdited: typeof value.isEdited === 'boolean' ? value.isEdited : undefined,
        isPinned: typeof value.isPinned === 'boolean' ? value.isPinned : undefined,
        replyToId: isString(value.replyToId) ? value.replyToId : undefined,
        createdAt: value.createdAt,
        author,
    };
}

function sortNewestFirst(items: ChannelMessage[]): ChannelMessage[] {
    return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function useServerData() {
    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [voiceChannels, setVoiceChannels] = useState<Channel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingServers, setLoadingServers] = useState(true);
    const [loadingChannels, setLoadingChannels] = useState(false);

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
            setLoadingChannels(true);
            setChannels([]);
            setVoiceChannels([]);
            setSelectedChannelId(null);
            try {
                const [textChannels, voiceChannels] = await Promise.all([
                    fetchChannels(selectedServerId),
                    getVoiceChannels(selectedServerId).catch(() => [] as Channel[]),
                ]);

                setChannels(textChannels);
                setVoiceChannels(voiceChannels);

                const firstText = textChannels.find((c) => c.type === 'text');
                if (firstText) {
                    setSelectedChannelId(firstText.id);
                } else {
                    setSelectedChannelId(null);
                }
            } catch (e) {
                console.error("Failed to load channels", e);
            } finally {
                setLoadingChannels(false);
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

        const refreshMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await fetchChannelMessages(selectedServerId, selectedChannelId);
                if (!cancelled) {
                    setMessages(sortNewestFirst(res.data));
                }
            } catch (e) {
                console.error("Failed to load messages", e);
            } finally {
                if (!cancelled) {
                    setLoadingMessages(false);
                }
            }
        };
        refreshMessages();

        const scheduleRefresh = () => {
            if (refreshTimeout !== null) return;
            refreshTimeout = window.setTimeout(() => {
                refreshTimeout = null;
                refreshMessages();
            }, 100);
        };

        const ws = useWebSocketStore.getState();
        ws.subscribeToChannel(selectedChannelId);

        const offNew = subscribeToEvent('channel_message', (data) => {
            const evt = data as ChannelMessageEventData;
            if (evt.channelId !== selectedChannelId) return;
            if (evt.serverId !== selectedServerId) return;

            const parsed = parseChannelMessage(evt.message);
            if (!parsed) {
                scheduleRefresh();
                return;
            }
            setMessages((prev) => {
                if (prev.some((m) => m.id === parsed.id)) return prev;
                return sortNewestFirst([parsed, ...prev]);
            });
        });
        const offEdit = subscribeToEvent('channel_message_edited', (data) => {
            const evt = data as ChannelMessageEventData;
            if (evt.channelId !== selectedChannelId) return;
            if (evt.serverId !== selectedServerId) return;

            const parsed = parseChannelMessage(evt.message);
            if (!parsed) {
                scheduleRefresh();
                return;
            }
            setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === parsed.id);
                if (idx === -1) return prev;
                const next = [...prev];
                next[idx] = parsed;
                return sortNewestFirst(next);
            });
        });
        const offDelete = subscribeToEvent('channel_message_deleted', (data) => {
            const evt = data as ChannelMessageEventData;
            if (evt.channelId !== selectedChannelId) return;
            if (evt.serverId !== selectedServerId) return;

            const messageId = isRecord(evt.message) && isString(evt.message.id) ? evt.message.id : null;
            if (!messageId) {
                scheduleRefresh();
                return;
            }
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
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
            const msg = await sendChannelMessage(selectedServerId, selectedChannelId, content);
            setMessages((prev) => sortNewestFirst([msg, ...prev]));
        } catch (e) {
            console.error("Failed to send", e);
        }
    };

    return {
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
        selectedServer: servers.find(s => s.id === selectedServerId),
        selectedChannel: channels.find(c => c.id === selectedChannelId),
    };
}
