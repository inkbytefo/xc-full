import type { Channel } from "../../../../api/types";
import type { ChannelParticipant } from "../../../../lib/websocket/types";

export interface VoiceParticipant {
    sid: string;
    identity: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isLocal: boolean;
}

export interface ChannelSidebarProps {
    // Server ID for API calls
    serverId: string;

    // Channel data
    categories: Channel[];
    groupedChannels: Map<string | null, Channel[]>;
    voiceChannels: Channel[];

    // Selection state
    selectedChannel: string | null;
    activeVoiceChannelId: string | null;
    isVoiceConnected: boolean;
    isVoiceConnecting: boolean;

    // Participants
    voiceParticipants: VoiceParticipant[];
    channelParticipants?: Map<string, ChannelParticipant[]>;

    // UI state
    channelsLoading: boolean;
    canManageChannels?: boolean;

    // Callbacks
    onSelectChannel: (channelId: string) => void;
    onVoiceChannelClick: (channelId: string) => void;
    onAddChannel?: () => void;
    onEditChannel?: (channel: Channel) => void;
    onDeleteChannel?: (channel: Channel) => void;
    onReorderChannels?: (updates: Array<{ id: string; position: number; parentId?: string | null }>) => Promise<void>;
}
