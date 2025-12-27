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

    // Modal Openers
    onServerProfile: () => void;
    onMembers: () => void;
    onCreateChannel: () => void;
    onSettings: () => void;
    onLeave: () => void;
    onInvitePeople: () => void;
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
                onEditChannel={(channel) => {
                    // TODO: Open edit channel modal
                    console.log("Edit channel:", channel);
                }}
                onDeleteChannel={async (channel) => {
                    if (confirm(`"${channel.name}" kanalını silmek istediğinize emin misiniz?`)) {
                        try {
                            if (channel.type === "voice" || channel.type === "video" || channel.type === "stage") {
                                await import("../../voice/voiceApi").then(m => m.deleteVoiceChannel(channel.id));
                            } else {
                                await import("../../servers/serversApi").then(m => m.deleteChannel(currentServer.id, channel.id));
                            }

                            // Note: We rely on parent to refresh or the store triggers update.
                            // However, ServersPage passes a callback that refreshes. 
                            // But here we are inline defined. 
                            // Ideally, `onDeleteChannel` should be a prop passed down entirely, 
                            // instead of implementing logic here.
                            // But for refactoring 'view', I'll keep logic in View or move to Page?
                            // Moving to Page makes View cleaner.
                            // I will keep as is for now mimicking existing structure then optimize.
                        } catch (err) {
                            console.error("Failed to delete channel:", err);
                        }
                    }
                }}
                onReorderChannels={async (updates) => {
                    try {
                        const { reorderChannels } = await import("../../servers/serversApi");
                        await reorderChannels(currentServer.id, updates);
                    } catch (err) {
                        console.error("Failed to reorder channels:", err);
                    }
                }}
            />

            {/* User Panel */}
            <UserPanel
                user={currentUser}
            />
        </>
    );
}
