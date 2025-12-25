// ============================================================================
// Online Status Hook
// ============================================================================

import { useWebSocketStore } from "./store";

/**
 * Hook to check if a user is online
 */
export function useOnlineStatus(userId: string | undefined): boolean {
    const onlineUsers = useWebSocketStore((state) => state.onlineUsers);
    return userId ? onlineUsers.has(userId) : false;
}

/**
 * Hook to get all online user IDs
 */
export function useOnlineUsers(): Set<string> {
    return useWebSocketStore((state) => state.onlineUsers);
}

/**
 * Hook to check if any of the given user IDs are online
 */
export function useAnyOnline(userIds: string[]): boolean {
    const onlineUsers = useWebSocketStore((state) => state.onlineUsers);
    return userIds.some((id) => onlineUsers.has(id));
}
