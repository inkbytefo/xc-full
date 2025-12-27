// ============================================================================
// useServerData - React Query Based Server Data Hook
// ============================================================================
// This is a facade that uses the global React Query hooks for servers.
// It maintains backward compatibility with the existing component interface.

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Server, Channel } from "../../../api/types";
import {
    useServers,
    useChannels,
    useJoinServer,
    useLeaveServer,

    serverKeys,
} from "../../../lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { getVoiceChannels, type VoiceChannel } from "../../voice/voiceApi";
import { getServerByHandle, getServer } from "../serversApi";
import { useQuery } from "@tanstack/react-query";
import { useWebSocketStore } from "../../../lib/websocket/store";
import { api } from "../../../api/client";
import type { ChannelParticipant } from "../../../lib/websocket/types";

interface UseServerDataOptions {
    onError?: (message: string) => void;
}

interface UseServerDataReturn {
    // Data
    servers: Server[];
    channels: Channel[];
    voiceChannels: VoiceChannel[];
    selectedServer: string | null;
    selectedChannel: string | null;
    currentServer: Server | undefined;
    currentChannel: Channel | undefined;

    // Filtered channels
    infoChannels: Channel[];
    textChannels: Channel[];

    // Category hierarchy
    categories: Channel[];
    groupedChannels: Map<string | null, Channel[]>;

    // Participants (Voice)
    // Map<ChannelID, Participants[]>
    channelParticipants: Map<string, ChannelParticipant[]>;

    // Loading states
    loading: boolean;
    isInitialLoadComplete: boolean;
    channelsLoading: boolean;

    // Actions
    setSelectedServer: (serverId: string | null) => void;
    setSelectedChannel: (channelId: string | null) => void;
    handleSelectServer: (serverId: string) => void;
    handleSelectChannel: (channelId: string) => void;
    handleJoinServer: (serverId: string) => Promise<void>;
    handleLeaveServer: () => Promise<void>;
    handleServerCreated: (newServerId: string) => Promise<void>;
    refreshServers: () => Promise<void>;
    refreshChannels: () => Promise<void>;
    setServers: React.Dispatch<React.SetStateAction<Server[]>>;
}

export function useServerData(options: UseServerDataOptions = {}): UseServerDataReturn {
    const { serverId: urlServerId, channelId: urlChannelId, handle: urlHandle } = useParams<{
        serverId?: string;
        channelId?: string;
        handle?: string;
    }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {
        channelParticipants: storeParticipants,
        setAllParticipants,
        subscribeToServer,
        unsubscribeFromServer
    } = useWebSocketStore();

    // React Query: Servers
    const {
        data: serversData = [],
        isLoading: serversLoading,
        error: serversError,
    } = useServers();

    // Selection state (local)
    const [selectedServer, setSelectedServer] = useState<string | null>(urlServerId ?? null);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(urlChannelId ?? null);
    const [lastChannelPerServer, setLastChannelPerServer] = useState<Map<string, string>>(new Map());

    // Voice channels (still using useState - no React Query hook for this yet)
    const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
    const [voiceLoading, setVoiceLoading] = useState(false);

    // React Query: Channels for selected server
    const {
        data: channelsData = [],
        isLoading: channelsLoading,
        error: channelsError,
    } = useChannels(selectedServer);

    // React Query: Mutations
    const joinServerMutation = useJoinServer();
    const leaveServerMutation = useLeaveServer();

    // Derived: servers array (for backward compatibility with setServers)
    const servers = useMemo(() => serversData, [serversData]);
    const channels = useMemo(() => channelsData, [channelsData]);

    // React Query: Fetch individual server if not in list (e.g. public preview, handle access)
    // We only fetch if we have a selectedServer but it's not in the main list
    const serverInList = serversData.find((s) => s.id === selectedServer);

    // Resolve handle to server ID
    useEffect(() => {
        if (urlHandle) {
            getServerByHandle(urlHandle)
                .then(server => {
                    setSelectedServer(server.id);
                })
                .catch(_err => {
                    if (options.onError) options.onError("Server not found");
                });
        }
    }, [urlHandle, options.onError]);

    const { data: individualServer } = useQuery({
        queryKey: serverKeys.detail(selectedServer || ""),
        queryFn: () => getServer(selectedServer!),
        enabled: !!selectedServer && !serverInList,
        retry: false,
    });

    const currentServer = serverInList || individualServer;
    const currentChannel = channels.find((c) => c.id === selectedChannel);

    // Categorize channels
    const infoChannels = useMemo(() => channels.filter(
        (c) =>
            c.type === "announcement" ||
            c.name.includes("welcome") ||
            c.name.includes("announcement") ||
            c.name.includes("rules")
    ), [channels]);

    const textChannels = useMemo(() => channels.filter(
        (c) => c.type === "text" && !infoChannels.includes(c)
    ), [channels, infoChannels]);

    // Extract voice-enabled channels from unified API (voice, video, stage, hybrid)
    const unifiedVoiceChannels = useMemo(() => channels.filter(
        (c) => c.type === "voice" || c.type === "video" || c.type === "stage" || c.type === "hybrid"
    ), [channels]);

    // Category channels (for hierarchy display)
    const categories = useMemo(() => channels.filter(
        (c) => c.type === "category"
    ).sort((a, b) => a.position - b.position), [channels]);

    // Grouped channels by category (for dynamic sidebar)
    const groupedChannels = useMemo(() => {
        const groups = new Map<string | null, typeof channels>();

        // Initialize with null key for uncategorized
        groups.set(null, []);

        // Initialize category groups
        categories.forEach(cat => groups.set(cat.id, []));

        // Group non-category channels
        channels.forEach(ch => {
            if (ch.type === "category") return;
            const parentKey = ch.parentId || null;
            const group = groups.get(parentKey) || groups.get(null)!;
            group.push(ch);
        });

        // Sort each group by position
        groups.forEach(group => group.sort((a, b) => a.position - b.position));

        return groups;
    }, [channels, categories]);

    // Transform store participants (Map<ChannelID, Map<UserID, Participant>>) to Map<ChannelID, Participant[]>
    const channelParticipants = useMemo(() => {
        const result = new Map<string, ChannelParticipant[]>();
        storeParticipants.forEach((userMap, channelId) => {
            result.set(channelId, Array.from(userMap.values()));
        });
        return result;
    }, [storeParticipants]);

    // Fetch initial participants and subscribe to updates
    useEffect(() => {
        if (!selectedServer) return;

        // 1. Subscribe to server events (voice updates)
        subscribeToServer(selectedServer);

        // 2. Fetch initial active participants
        api.get<{ data: ChannelParticipant[] }>(`/servers/${selectedServer}/active-voice-users`)
            .then(res => {
                if (res.data) {
                    setAllParticipants(res.data);
                }
            })
            .catch(err => {
                console.error("Failed to fetch active voice users:", err);
            });

        return () => {
            unsubscribeFromServer(selectedServer);
        };
    }, [selectedServer, subscribeToServer, unsubscribeFromServer, setAllParticipants]);

    // Loading states
    const loading = serversLoading;
    const isInitialLoadComplete = !serversLoading;

    // Handle errors
    useEffect(() => {
        if (serversError && options.onError) {
            options.onError(serversError instanceof Error ? serversError.message : "Sunucular yüklenemedi");
        }
    }, [serversError, options.onError]);

    useEffect(() => {
        if (channelsError && options.onError) {
            options.onError(channelsError instanceof Error ? channelsError.message : "Kanallar yüklenemedi");
        }
    }, [channelsError, options.onError]);

    // Load voice channels when server changes
    // Now we merge voice channels from both unified API and legacy voice API
    useEffect(() => {
        if (!selectedServer) {
            setVoiceChannels([]);
            return;
        }

        let cancelled = false;
        async function loadVoice() {
            setVoiceLoading(true);
            try {
                const legacyVoice = await getVoiceChannels(selectedServer!);
                if (!cancelled) {
                    // Merge: unified voice channels take precedence, legacy fills gaps
                    const unifiedIds = new Set(unifiedVoiceChannels.map(c => c.id));
                    const merged = legacyVoice.filter(v => !unifiedIds.has(v.id));
                    setVoiceChannels(merged);
                }
            } catch {
                // Voice channels are optional
                if (!cancelled) {
                    setVoiceChannels([]);
                }
            } finally {
                if (!cancelled) {
                    setVoiceLoading(false);
                }
            }
        }
        loadVoice();
        return () => { cancelled = true; };
    }, [selectedServer, unifiedVoiceChannels]);

    // Auto-select first channel when channels load
    useEffect(() => {
        if (channels.length > 0 && !selectedChannel) {
            const textCh = channels.filter((c) => c.type === "text");
            if (textCh.length > 0) {
                setSelectedChannel(textCh[0].id);
            }
        }
    }, [channels, selectedChannel]);

    // Sync state FROM URL
    useEffect(() => {
        if (urlServerId && urlServerId !== selectedServer) {
            setSelectedServer(urlServerId);
        } else if (!urlServerId && selectedServer) {
            setSelectedServer(null);
        }

        if (urlChannelId && urlChannelId !== selectedChannel) {
            setSelectedChannel(urlChannelId);
        } else if (!urlChannelId && selectedChannel && !selectedServer) {
            // Only clear channel if we also don't have a server (root /servers)
            // If we have a server but no channel param, that's valid (default channel)
            setSelectedChannel(null);
        }
    }, [urlServerId, urlChannelId]);

    // Sync URL FROM state (only when on /servers path)
    useEffect(() => {
        if (!selectedServer) return;

        const currentPath = window.location.pathname;

        // Only sync URL if we're actually on a /servers path
        // This prevents hijacking navigation to other routes like /feed or /dms
        if (!currentPath.startsWith('/servers')) return;

        const targetPath = selectedChannel
            ? `/servers/${selectedServer}/channels/${selectedChannel}`
            : `/servers/${selectedServer}`;

        if (currentPath !== targetPath) {
            navigate(targetPath, { replace: true });
        }
    }, [selectedServer, selectedChannel, navigate]);

    // Handlers
    const handleSelectServer = useCallback(
        (serverId: string) => {
            setSelectedServer(serverId);
            const lastChannel = lastChannelPerServer.get(serverId) || null;
            setSelectedChannel(lastChannel);
        },
        [lastChannelPerServer]
    );

    const handleSelectChannel = useCallback(
        (channelId: string) => {
            setSelectedChannel(channelId);
            if (selectedServer) {
                setLastChannelPerServer((prev) => new Map(prev).set(selectedServer, channelId));
            }
        },
        [selectedServer]
    );

    const refreshServers = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: serverKeys.all });
    }, [queryClient]);

    const refreshChannels = useCallback(async () => {
        if (!selectedServer) return;

        // Refresh text/category channels (Query)
        const p1 = queryClient.invalidateQueries({ queryKey: serverKeys.channels(selectedServer) });

        // Refresh voice channels (Manual State)
        const p2 = (async () => {
            setVoiceLoading(true);
            try {
                const data = await getVoiceChannels(selectedServer);
                setVoiceChannels(data);
            } catch (error) {
                console.error("Failed to refresh voice channels:", error);
            } finally {
                setVoiceLoading(false);
            }
        })();

        await Promise.all([p1, p2]);
    }, [selectedServer, queryClient]);

    const handleServerCreated = useCallback(async (newServerId: string) => {
        await refreshServers();
        setSelectedServer(newServerId);
    }, [refreshServers]);

    const handleJoinServer = useCallback(async (serverId: string) => {
        const result = await joinServerMutation.mutateAsync(serverId);
        if (!result.pending) {
            setSelectedServer(serverId);
        }
    }, [joinServerMutation]);

    const handleLeaveServer = useCallback(async () => {
        if (!currentServer) return;
        await leaveServerMutation.mutateAsync(currentServer.id);
        setSelectedServer(null);
    }, [currentServer, leaveServerMutation]);

    // Backward compatibility: setServers is a no-op since we use React Query
    // But we provide it to avoid breaking existing code
    const setServers = useCallback((action: React.SetStateAction<Server[]>) => {
        // For cache updates, use queryClient.setQueryData instead
        if (typeof action === 'function') {
            queryClient.setQueryData<Server[]>(serverKeys.all, (old) =>
                action(old ?? [])
            );
        } else {
            queryClient.setQueryData<Server[]>(serverKeys.all, action);
        }
    }, [queryClient]);

    return {
        servers,
        channels,
        voiceChannels,
        selectedServer,
        selectedChannel,
        currentServer,
        currentChannel,
        infoChannels,
        textChannels,
        categories,
        groupedChannels,
        channelParticipants,
        loading,
        isInitialLoadComplete,
        channelsLoading: channelsLoading || voiceLoading,
        setSelectedServer,
        setSelectedChannel,
        handleSelectServer,
        handleSelectChannel,
        handleJoinServer,
        handleLeaveServer,
        handleServerCreated,
        refreshServers,
        refreshChannels,
        setServers,
    };
}
