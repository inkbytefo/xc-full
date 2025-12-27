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
    const { serverId: urlServerId, channelId: urlChannelId } = useParams<{
        serverId?: string;
        channelId?: string;
    }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

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

    const currentServer = servers.find((s) => s.id === selectedServer);
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
    useEffect(() => {
        if (!selectedServer) {
            setVoiceChannels([]);
            return;
        }

        let cancelled = false;
        async function loadVoice() {
            setVoiceLoading(true);
            try {
                const data = await getVoiceChannels(selectedServer!);
                if (!cancelled) {
                    setVoiceChannels(data);
                }
            } catch {
                // Voice channels are optional
            } finally {
                if (!cancelled) {
                    setVoiceLoading(false);
                }
            }
        }
        loadVoice();
        return () => { cancelled = true; };
    }, [selectedServer]);

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
        }
        if (urlChannelId && urlChannelId !== selectedChannel) {
            setSelectedChannel(urlChannelId);
        }
    }, [urlServerId, urlChannelId]);

    // Sync URL FROM state
    useEffect(() => {
        if (!selectedServer) return;

        const currentPath = window.location.pathname;
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
        await queryClient.invalidateQueries({ queryKey: serverKeys.channels(selectedServer) });
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
