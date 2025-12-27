import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useVoiceStore } from "../../store/voiceStore";
import type { Channel } from "../../api/types";

// Custom Hooks
import { useServerData, useChannelMessages, useServerMembers } from "./hooks";

// Components
import { MembersPanel } from "./components";

// Views
import { ServerSelectionView } from "./views/ServerSelectionView";
// ... (rest of imports)
import { ServerChannelView } from "./views/ServerChannelView";
import { ServerContentArea } from "./views/ServerContentArea";

// Modals
import { MembersModal } from "./MembersModal";
import { CreateChannelModal } from "./CreateChannelModal";
import { CreateServerModal } from "./CreateServerModal";
import { ExploreServersModal } from "./ExploreServersModal";
import { ServerSettingsModal } from "./ServerSettingsModal";

export function ServersPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const handleError = useCallback((message: string) => setError(message), []);

  // Use custom hooks
  const serverData = useServerData({ onError: handleError });
  const members = useServerMembers({
    serverId: serverData.selectedServer,
    onError: handleError,
  });

  // Voice Store
  const voiceStore = useVoiceStore();

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showServerSettingsModal, setShowServerSettingsModal] = useState(false);
  const [showServerProfile, setShowServerProfile] = useState(false);
  const [isViewingVoiceRoom, setIsViewingVoiceRoom] = useState(false);

  const chatMessages = useChannelMessages({
    serverId: serverData.selectedServer,
    channelId: serverData.selectedChannel,
    onError: handleError,
  });
  const voiceChatMessages = useChannelMessages({
    serverId: serverData.selectedServer,
    channelId: isViewingVoiceRoom ? voiceStore.activeChannelId : null,
    onError: handleError,
  });

  // Derived values
  const isOwner = serverData.currentServer?.ownerId === currentUser?.id;
  const myMembership = members.members.find((m) => m.id === currentUser?.id);
  const isModerator = myMembership?.role === "moderator";
  const isAdmin = myMembership?.role === "admin" || myMembership?.role === "owner";
  const filteredServers = serverData.servers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Permission check: Can user send messages in current channel?
  const canSendInChannel = useMemo(() => {
    const ch = serverData.currentChannel;
    if (!ch) return false;

    // Owner can always send
    if (isOwner) return true;

    // Admin/moderator can send to announcement channels
    if (ch.type === "announcement") {
      return isAdmin || isModerator;
    }

    // Regular channels: any member can send
    return true;
  }, [serverData.currentChannel, isOwner, isAdmin, isModerator]);

  // Voice channel handlers
  const handleVoiceChannelClick = useCallback(
    (channelId: string) => {
      const channel = serverData.voiceChannels.find((c) => c.id === channelId);
      if (!channel) return;

      if (voiceStore.isConnected && voiceStore.activeChannelId === channelId) {
        setIsViewingVoiceRoom(!isViewingVoiceRoom);
        return;
      }

      voiceStore.connect(channel);
      setIsViewingVoiceRoom(true);
    },
    [voiceStore, serverData.voiceChannels, isViewingVoiceRoom]
  );

  const handleSelectChannel = useCallback(
    (channelId: string) => {
      serverData.handleSelectChannel(channelId);
      setIsViewingVoiceRoom(false);
      setShowServerProfile(false); // Close server profile when selecting a channel
    },
    [serverData]
  );

  const voiceChatChannel = useMemo<Channel | null>(() => {
    const vc = voiceStore.activeChannel;
    if (!vc) return null;
    if (!serverData.currentServer) return null;
    if (vc.serverId !== serverData.currentServer.id) return null;
    return {
      id: vc.id,
      serverId: vc.serverId,
      name: vc.name,
      type: "voice",
      position: vc.position,
      description:
        vc.type === "video" ? "Video odası" : vc.type === "stage" ? "Stage odası" : "Sesli oda",
    };
  }, [serverData.currentServer, voiceStore.activeChannel]);

  // Join server handler
  const handleJoinServer = async (serverId: string) => {
    try {
      await serverData.handleJoinServer(serverId);
      setShowExploreModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sunucuya katılınamadı");
      setShowExploreModal(false);
    }
  };

  // Loading state
  if (!serverData.isInitialLoadComplete) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
          <p className="text-zinc-500 text-sm">Sunucular yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Modals */}
      <ExploreServersModal
        isOpen={showExploreModal}
        onClose={() => setShowExploreModal(false)}
        onJoin={handleJoinServer}
      />

      <CreateServerModal
        isOpen={showCreateServerModal}
        onClose={() => setShowCreateServerModal(false)}
        onServerCreated={serverData.handleServerCreated}
      />

      {serverData.currentServer && (
        <>
          <CreateChannelModal
            isOpen={showCreateChannelModal}
            onClose={() => setShowCreateChannelModal(false)}
            serverId={serverData.currentServer.id}
            onChannelCreated={serverData.refreshChannels}
          />

          <ServerSettingsModal
            isOpen={showServerSettingsModal}
            onClose={() => setShowServerSettingsModal(false)}
            server={serverData.currentServer}
            onServerUpdated={(updated) => {
              serverData.setServers((prev) =>
                prev.map((s) => (s.id === updated.id ? updated : s))
              );
            }}
            onServerDeleted={() => {
              serverData.setServers((prev) =>
                prev.filter((s) => s.id !== serverData.currentServer!.id)
              );
              serverData.setSelectedServer(null);
              navigate("/servers");
            }}
          />

          <MembersModal
            isOpen={showMembersModal}
            onClose={() => setShowMembersModal(false)}
            serverId={serverData.currentServer.id}
            serverName={serverData.currentServer.name}
            ownerId={serverData.currentServer.ownerId}
            isAdmin={isAdmin}
            isModerator={isModerator}
          />
        </>
      )}

      {/* ================================================================
          UNIFIED SIDEBAR - Server List or Channel View
      ================================================================ */}
      <div className="w-60 bg-[#0a0a0f]/90 backdrop-blur-xl flex flex-col border-r border-white/5 transition-all duration-200">
        {!serverData.currentServer ? (
          <ServerSelectionView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredServers={filteredServers}
            selectedServerId={serverData.selectedServer}
            onSelectServer={serverData.handleSelectServer}
            loading={serverData.loading}
            onExplore={() => setShowExploreModal(true)}
            onCreateServer={() => setShowCreateServerModal(true)}
          />
        ) : (
          <ServerChannelView
            currentServer={serverData.currentServer}
            categories={serverData.categories}
            groupedChannels={serverData.groupedChannels}
            voiceChannels={serverData.voiceChannels}
            selectedChannelId={serverData.selectedChannel}
            voiceStore={voiceStore}
            channelsLoading={serverData.channelsLoading}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isModerator={isModerator}
            showServerMenu={showServerMenu}
            onToggleMenu={() => setShowServerMenu(!showServerMenu)}
            onBack={() => serverData.setSelectedServer(null)}
            onSelectChannel={handleSelectChannel}
            onVoiceChannelClick={handleVoiceChannelClick}
            onServerProfile={() => {
              setShowServerProfile(true);
              setShowServerMenu(false);
            }}
            onMembers={() => {
              setShowMembersModal(true);
              setShowServerMenu(false);
            }}
            onCreateChannel={() => {
              setShowCreateChannelModal(true);
              setShowServerMenu(false);
            }}
            onSettings={() => {
              setShowServerSettingsModal(true);
              setShowServerMenu(false);
            }}
            onLeave={() => {
              if (confirm(`"${serverData.currentServer!.name}" sunucusundan ayrılmak istediğinize emin misiniz?`)) {
                serverData.handleLeaveServer().catch((e) => {
                  setError(e instanceof Error ? e.message : "Sunucudan ayrılınamadı");
                });
              }
              setShowServerMenu(false);
            }}
            onInvitePeople={() => {
              // TODO: Implement invite modal
              setShowServerMenu(false);
            }}
          />
        )}
      </div>

      {/* ================================================================
          MAIN CONTENT AREA
      ================================================================ */}
      <ServerContentArea
        serverData={serverData}
        error={error}
        voiceStore={voiceStore}
        showServerProfile={showServerProfile}
        setShowServerProfile={setShowServerProfile}
        isViewingVoiceRoom={isViewingVoiceRoom}
        setIsViewingVoiceRoom={setIsViewingVoiceRoom}
        chatMessages={chatMessages}
        voiceChatMessages={voiceChatMessages}
        voiceChatChannel={voiceChatChannel}
        canSendInChannel={canSendInChannel}
        members={members.members}
        isOwner={isOwner}
        isModerator={isModerator}
        isAdmin={isAdmin}
        handleJoinServer={handleJoinServer}
        handleSelectServer={serverData.handleSelectServer}
        onSettings={() => setShowServerSettingsModal(true)}
      />

      {/* ================================================================
          RIGHT SIDEBAR - Members Panel
      ================================================================ */}
      {serverData.currentServer && serverData.currentChannel && !isViewingVoiceRoom && (
        <MembersPanel
          members={members.members}
          membersByRole={members.membersByRole}
          loading={members.loading}
          serverId={serverData.currentServer.id}
        />
      )}
    </div>
  );
}
