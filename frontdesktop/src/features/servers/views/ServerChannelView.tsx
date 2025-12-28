import { ServerHeader, UserPanel, ChevronLeftIcon } from "../components";
import { ChannelSidebar } from "../components/channel-sidebar";
import { Server, Channel } from "../../../api/types";
import { useAuthStore } from "../../../store/authStore";

interface ServerChannelViewProps {
    currentServer: Server;
    categories: Channel[];
    groupedChannels: Map<string | null, Channel[]>; // Corrected type
    voiceChannels: Channel[];
    selectedChannelId: string | null;
    voiceStore: any;
    channelsLoading: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isModerator: boolean;
    showServerMenu: boolean;
    onToggleMenu: () => void;
    onBack: () => void;
    onSelectChannel: (channelId: string) => void;
    onVoiceChannelClick: (channelId: string) => void;
    onEditChannel?: (channel: Channel) => void;
    onDeleteChannel?: (channel: Channel) => void | Promise<void>;
    onReorderChannels?: (updates: Array<{ id: string; position: number; parentId?: string | null }>) => Promise<void>;

    // Modal Openers
    onServerProfile: () => void;
    onMembers: () => void;
    onCreateChannel: () => void;
    onSettings: () => void;
    onLeave: () => void;
    onInvitePeople?: () => void;
}

export function ServerChannelView({
    currentServer,
    categories,
    groupedChannels,
    voiceChannels,
    selectedChannelId,
    voiceStore,
    channelsLoading,
    isOwner,
    isAdmin,
    isModerator,
    showServerMenu,
    onToggleMenu,
    onBack,
    onSelectChannel,
    onVoiceChannelClick,
    onEditChannel,
    onDeleteChannel,
    onReorderChannels,
    onServerProfile,
    onMembers,
    onCreateChannel,
    onSettings,
    onLeave,
    onInvitePeople
}: ServerChannelViewProps) {
    const currentUser = useAuthStore((s) => s.user);

    return (
        <>
            {/* Back Button */}
            <div className="p-2 border-b border-white/5">
                <button
                    onClick={onBack}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-400 hover:text-zinc-200"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span className="text-sm">Back to Servers</span>
                </button>
            </div>

            {/* Server Header with Dropdown */}
            <ServerHeader
                server={currentServer}
                isOwner={isOwner}
                isModerator={isModerator}
                isAdmin={isAdmin}
                showMenu={showServerMenu}
                onToggleMenu={onToggleMenu}
                onServerProfile={onServerProfile}
                onMembers={onMembers}
                onCreateChannel={onCreateChannel}
                onSettings={onSettings}
                onLeave={onLeave}
                onInvitePeople={onInvitePeople}
            />

            {/* Channel Sidebar */}
            <ChannelSidebar
                serverId={currentServer.id}
                categories={categories}
                groupedChannels={groupedChannels}
                voiceChannels={voiceChannels}
                selectedChannel={selectedChannelId}
                activeVoiceChannelId={voiceStore.activeChannelId}
                isVoiceConnected={voiceStore.isConnected}
                isVoiceConnecting={voiceStore.isConnecting}
                voiceParticipants={voiceStore.participants}
                channelsLoading={channelsLoading}
                canManageChannels={isOwner || isAdmin}
                onSelectChannel={onSelectChannel}
                onVoiceChannelClick={onVoiceChannelClick}
                onAddChannel={onCreateChannel}
                onEditChannel={onEditChannel}
                onDeleteChannel={onDeleteChannel}
                onReorderChannels={onReorderChannels}
            />

            {/* User Panel */}
            <UserPanel
                user={currentUser}
            />
        </>
    );
}
