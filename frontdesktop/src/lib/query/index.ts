// ============================================================================
// Query Hooks and Utilities - Public API
// ============================================================================

// Provider
export { QueryProvider, queryClient } from './QueryProvider';

// Real-time sync
export { useRealtimeSync } from './useRealtimeSync';

// Message hooks (DM)
export {
    useMessages,
    useSendMessage,
    useEditMessage,
    useDeleteMessage,
    messageKeys,
} from './hooks/useMessages';

// Conversation hooks
export {
    useConversations,
    useStartConversation,
    useMarkAsRead,
    conversationKeys,
} from './hooks/useConversations';

// Channel Message hooks
export {
    useChannelMessages,
    useSendChannelMessage,
    useEditChannelMessage,
    useDeleteChannelMessage,
    useAckChannelMessage,
    channelMessageKeys,
} from './hooks/useChannelMessages';

// Server hooks
export {
    useServers,
    useServer,
    useChannels,
    useServerMembers,
    useCreateServer,
    useJoinServer,
    useLeaveServer,
    serverKeys,
} from './hooks/useServers';

export {
    useFollowers,
    useFollowing,
    useFollowUser,
    useUnfollowUser,
    useToggleFollow,
    followerKeys,
} from './hooks/useFollowers';

// User profile keys (re-export from profile feature hooks)
export { userKeys } from '../../features/profile/hooks/useUserProfile';
