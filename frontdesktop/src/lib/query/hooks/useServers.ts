// ============================================================================
// useServers Hook - Server List with React Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchServers,
    getServer,
    createServer,
    joinServer,
    leaveServer,
    fetchChannels,
} from '../../../features/servers/serversApi';
import type { Server } from '../../../api/types';

// ============================================================================
// Query Keys
// ============================================================================

export const serverKeys = {
    all: ['servers'] as const,
    detail: (id: string) => ['servers', id] as const,
    channels: (serverId: string) => ['channels', serverId] as const,
};

// ============================================================================
// useServers - User's Server List
// ============================================================================

export function useServers() {
    return useQuery({
        queryKey: serverKeys.all,
        queryFn: fetchServers,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// ============================================================================
// useServer - Single Server Details
// ============================================================================

export function useServer(serverId: string | null) {
    return useQuery({
        queryKey: serverId ? serverKeys.detail(serverId) : ['servers', 'none'],
        queryFn: () => {
            if (!serverId) throw new Error('No server ID');
            return getServer(serverId);
        },
        enabled: !!serverId,
        staleTime: 1000 * 60 * 5,
    });
}

// ============================================================================
// useChannels - Server Channels
// ============================================================================

export function useChannels(serverId: string | null) {
    return useQuery({
        queryKey: serverId ? serverKeys.channels(serverId) : ['channels', 'none'],
        queryFn: () => {
            if (!serverId) throw new Error('No server ID');
            return fetchChannels(serverId);
        },
        enabled: !!serverId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// ============================================================================
// useCreateServer - Create New Server
// ============================================================================

export function useCreateServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; description?: string; isPublic?: boolean }) =>
            createServer(data),

        onSuccess: (newServer) => {
            // Add new server to cache
            queryClient.setQueryData<Server[]>(
                serverKeys.all,
                (old) => old ? [newServer, ...old] : [newServer]
            );
        },
    });
}

// ============================================================================
// useJoinServer - Join a Server
// ============================================================================

export function useJoinServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (serverId: string) => joinServer(serverId),

        onSuccess: () => {
            // Invalidate servers list to refetch
            queryClient.invalidateQueries({ queryKey: serverKeys.all });
        },
    });
}

// ============================================================================
// useLeaveServer - Leave a Server
// ============================================================================

export function useLeaveServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (serverId: string) => leaveServer(serverId),

        onMutate: async (serverId) => {
            // Optimistically remove server from list
            const previousServers = queryClient.getQueryData<Server[]>(serverKeys.all);

            queryClient.setQueryData<Server[]>(
                serverKeys.all,
                (old) => old?.filter((s) => s.id !== serverId)
            );

            return { previousServers };
        },

        onError: (_err, _serverId, context) => {
            if (context?.previousServers) {
                queryClient.setQueryData(serverKeys.all, context.previousServers);
            }
        },
    });
}
