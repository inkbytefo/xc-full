// ============================================================================
// Active Chat Store - Global Chat State Management for Overlay
// ============================================================================

import { create } from 'zustand';

export interface DMChatInfo {
    type: 'dm';
    conversationId: string;
    conversationName: string;
    otherUser?: {
        id: string;
        handle: string;
        displayName: string;
        avatarGradient?: [string, string];
    };
}

export interface ChannelChatInfo {
    type: 'channel';
    serverId: string;
    channelId: string;
    channelName: string;
    serverName?: string;
}

export type ActiveChat = DMChatInfo | ChannelChatInfo;

interface ActiveChatStore {
    activeChat: ActiveChat | null;

    // Actions
    setActiveChat: (chat: ActiveChat | null) => void;
    openChannelChat: (serverId: string, channelId: string, channelName: string, serverName?: string) => void;
    openDMChat: (conversationId: string, conversationName: string, otherUser?: DMChatInfo['otherUser']) => void;
    closeChat: () => void;
}

export const useActiveChatStore = create<ActiveChatStore>()((set) => ({
    activeChat: null,

    setActiveChat: (chat) => set({ activeChat: chat }),

    openChannelChat: (serverId, channelId, channelName, serverName) => set({
        activeChat: {
            type: 'channel',
            serverId,
            channelId,
            channelName,
            serverName
        }
    }),

    openDMChat: (conversationId, conversationName, otherUser) => set({
        activeChat: {
            type: 'dm',
            conversationId,
            conversationName,
            otherUser
        }
    }),

    closeChat: () => set({ activeChat: null })
}));
