import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useVoiceStore } from "../../store/voiceStore";
import type { Channel } from "../../api/types";
import { Modal, ModalBody, ModalFooter } from "../../components/Modal";

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
import { deleteChannel, reorderChannels, updateChannel } from "./serversApi";
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
  const [isViewingVoiceRoom, setIsViewingVoiceRoom] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCopyStatus, setInviteCopyStatus] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
  const myMembership = members.members.find((m) => m.userId === currentUser?.id);
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

  const inviteLink = useMemo(() => {
    if (!serverData.currentServer) return "";
    const path = serverData.currentServer.handle
      ? `/s/${serverData.currentServer.handle}`
      : `/servers/${serverData.currentServer.id}`;

    try {
      return new URL(path, window.location.origin).toString();
    } catch {
      return path;
    }
  }, [serverData.currentServer]);

  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopyStatus("Kopyalandı");
      window.setTimeout(() => setInviteCopyStatus(null), 1500);
    } catch {
      setInviteCopyStatus("Kopyalanamadı");
      window.setTimeout(() => setInviteCopyStatus(null), 2000);
    }
  }, [inviteLink]);

  const handleEditChannel = useCallback((channel: Channel) => {
    if (channel.type === "voice" || channel.type === "video" || channel.type === "stage") {
      setError("Sesli/Video kanalları için düzenleme henüz desteklenmiyor");
      return;
    }
    setEditingChannel(channel);
    setEditName(channel.name);
    setEditDescription(channel.description ?? "");
    setEditParentId(channel.parentId ?? "");
    setEditSaving(false);
    setEditError(null);
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

      <Modal
        isOpen={editingChannel !== null}
        onClose={() => setEditingChannel(null)}
        title="Kanalı Düzenle"
        size="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingChannel || !serverData.currentServer) return;

            const trimmedName = editName.trim();
            if (!trimmedName) {
              setEditError("Kanal adı gerekli");
              return;
            }
            if (trimmedName.length > 100) {
              setEditError("Kanal adı en fazla 100 karakter olabilir");
              return;
            }
            if (editDescription.length > 500) {
              setEditError("Açıklama en fazla 500 karakter olabilir");
              return;
            }

            setEditSaving(true);
            setEditError(null);

            const formattedName =
              editingChannel.type === "category" ? trimmedName : trimmedName.toLowerCase().replace(/\s+/g, "-");

            try {
              await updateChannel(serverData.currentServer.id, editingChannel.id, {
                name: formattedName,
                description: editDescription.trim() || undefined,
                parentId:
                  editingChannel.type === "category"
                    ? undefined
                    : editParentId.trim()
                      ? editParentId.trim()
                      : undefined,
              });
              setEditingChannel(null);
              await serverData.refreshChannels();
            } catch (err) {
              setEditError(err instanceof Error ? err.message : "Kanal güncellenemedi");
            } finally {
              setEditSaving(false);
            }
          }}
        >
          <ModalBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Kanal Adı</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
            </div>

            {editingChannel?.type !== "category" && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Açıklama</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>
            )}

            {editingChannel?.type !== "category" && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Kategori</label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Kategorisiz</option>
                  {serverData.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {editError}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setEditingChannel(null)}
              className="px-4 py-2 rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteCopyStatus(null);
        }}
        title="Sunucuyu Paylaş"
        size="md"
      >
        <ModalBody className="space-y-3">
          <div className="text-sm text-zinc-400">
            Bu linki paylaşarak kullanıcıların sunucu profilini açmasını sağlayabilirsiniz.
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Paylaşım Linki</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => void handleCopyInviteLink()}
                disabled={!inviteLink}
                className="px-4 py-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 transition-colors disabled:opacity-50 disabled:hover:bg-purple-500/20"
              >
                Kopyala
              </button>
            </div>
          </div>

          {inviteCopyStatus && (
            <div
              className={`text-sm ${inviteCopyStatus === "Kopyalandı" ? "text-green-300" : "text-red-300"}`}
              role="status"
            >
              {inviteCopyStatus}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowInviteModal(false)}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
          >
            Kapat
          </button>
          {serverData.currentServer && (
            <button
              type="button"
              onClick={() => {
                navigate(
                  serverData.currentServer!.handle
                    ? `/s/${serverData.currentServer!.handle}`
                    : `/servers/${serverData.currentServer!.id}`
                );
                setShowInviteModal(false);
              }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors"
            >
              Sunucu Profili
            </button>
          )}
        </ModalFooter>
      </Modal>

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
