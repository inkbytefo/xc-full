import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useVoiceStore } from "../../store/voiceStore";
import type { Channel } from "../../api/types";

// Custom Hooks
import {
  useServerData,
  useChannelMessages,
  useServerMembers,
  useServerPermissions,
  useVoiceChannelNavigation,
} from "./hooks";

// Components
import { MembersPanel } from "./components";
import { ServersPageModals } from "./components/ServersPageModals";

// Views
import { ServerSelectionView } from "./views/ServerSelectionView";
// ... (rest of imports)
import { ServerChannelView } from "./views/ServerChannelView";
import { ServerContentArea } from "./views/ServerContentArea";

import { deleteChannel, reorderChannels } from "./serversApi";
import { deleteVoiceChannel } from "../voice/voiceApi";

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  const {
    isViewingVoiceRoom,
    setIsViewingVoiceRoom,
    handleVoiceChannelClick,
    handleSelectChannel,
  } = useVoiceChannelNavigation({
    voiceChannels: serverData.voiceChannels,
    voiceStore,
    onSelectChannel: serverData.handleSelectChannel,
    onAfterSelectChannel: () => setShowServerProfile(false),
  });

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

  const { isOwner, isAdmin, isModerator, canSendInChannel } = useServerPermissions({
    currentUserId: currentUser?.id,
    server: serverData.currentServer,
    channel: serverData.currentChannel,
    members: members.members,
  });
  const filteredServers = serverData.servers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditChannel = useCallback((channel: Channel) => {
    if (channel.type === "voice" || channel.type === "video" || channel.type === "stage") {
      setError("Sesli/Video kanalları için düzenleme henüz desteklenmiyor");
      return;
    }
    setEditingChannel(channel);
  }, []);

  const handleDeleteChannel = useCallback(
    async (channel: Channel) => {
      if (!serverData.currentServer) return;
      if (!confirm(`"${channel.name}" kanalını silmek istediğinize emin misiniz?`)) return;

      try {
        if (channel.type === "voice" || channel.type === "video" || channel.type === "stage") {
          await deleteVoiceChannel(channel.id);
        } else {
          await deleteChannel(serverData.currentServer.id, channel.id);
        }

        if (serverData.selectedChannel === channel.id) {
          serverData.setSelectedChannel(null);
        }
        await serverData.refreshChannels();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kanal silinemedi");
      }
    },
    [
      deleteVoiceChannel,
      deleteChannel,
      serverData.currentServer,
      serverData.refreshChannels,
      serverData.selectedChannel,
      serverData.setSelectedChannel,
    ]
  );

  const handleReorderChannels = useCallback(
    async (updates: Array<{ id: string; position: number; parentId?: string | null }>) => {
      if (!serverData.currentServer) return;
      try {
        await reorderChannels(serverData.currentServer.id, updates);
        await serverData.refreshChannels();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kanal sıralaması güncellenemedi");
      }
    },
    [reorderChannels, serverData.currentServer, serverData.refreshChannels]
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
      <ServersPageModals
        currentServer={serverData.currentServer}
        categories={serverData.categories}
        refreshChannels={serverData.refreshChannels}
        handleServerCreated={serverData.handleServerCreated}
        setServers={serverData.setServers}
        setSelectedServer={serverData.setSelectedServer}
        isAdmin={isAdmin}
        isModerator={isModerator}
        showExploreModal={showExploreModal}
        setShowExploreModal={setShowExploreModal}
        showCreateServerModal={showCreateServerModal}
        setShowCreateServerModal={setShowCreateServerModal}
        showCreateChannelModal={showCreateChannelModal}
        setShowCreateChannelModal={setShowCreateChannelModal}
        showServerSettingsModal={showServerSettingsModal}
        setShowServerSettingsModal={setShowServerSettingsModal}
        showMembersModal={showMembersModal}
        setShowMembersModal={setShowMembersModal}
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
        editingChannel={editingChannel}
        setEditingChannel={setEditingChannel}
        onJoinServer={handleJoinServer}
        onNavigate={navigate}
      />

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
            onEditChannel={handleEditChannel}
            onDeleteChannel={handleDeleteChannel}
            onReorderChannels={handleReorderChannels}
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
            onInvitePeople={() => {
              setShowInviteModal(true);
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
