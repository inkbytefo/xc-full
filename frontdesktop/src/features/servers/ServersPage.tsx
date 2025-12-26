import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useVoiceStore } from "../../store/voiceStore";
import type { Channel } from "../../api/types";

// Custom Hooks
import { useServerData, useChannelMessages, useServerMembers } from "./hooks";

// Components
import {
  ServerList,
  ChannelSidebar,
  ChatArea,
  MembersPanel,
  ServerHeader,
  UserPanel,
  ServerProfileView,
  SearchIcon,
  PlusIcon,
  ChevronLeftIcon,
  DiscoveryDashboard,
  VideoRoomView,
  VoiceOverlay,
  VolumeIcon,
  VideoIcon,
} from "./components";

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
          /* SERVER LIST VIEW */
          <>
            {/* Search Bar */}
            <div className="p-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <SearchIcon className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  name="server-search"
                  id="server-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a server..."
                  className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Your Servers Header */}
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Your Servers
              </span>
            </div>

            {/* Server List */}
            {filteredServers.length > 0 ? (
              <ServerList
                servers={filteredServers}
                selectedServerId={serverData.selectedServer}
                onSelectServer={serverData.handleSelectServer}
                loading={serverData.loading}
              />
            ) : searchQuery ? (
              <div className="flex-1 px-4 py-8 text-center">
                <p className="text-sm text-zinc-500 mb-4">Sunucu bulunamadı</p>
                <button
                  onClick={() => setShowExploreModal(true)}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 uppercase tracking-wider"
                >
                  Tüm sunucuları keşfet
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs italic">
                Henüz bir sunucuya katılmadınız
              </div>
            )}

            {/* Create Server Button */}
            <div className="p-3 border-t border-white/5">
              <button
                onClick={() => setShowCreateServerModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium uppercase tracking-wider">
                  Create Server
                </span>
              </button>
            </div>
          </>
        ) : (
          /* CHANNEL VIEW */
          <>
            {/* Back Button */}
            <div className="p-2 border-b border-white/5">
              <button
                onClick={() => serverData.setSelectedServer(null)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-zinc-400 hover:text-zinc-200"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span className="text-sm">Back to Servers</span>
              </button>
            </div>

            {/* Server Header with Dropdown */}
            <ServerHeader
              server={serverData.currentServer}
              isOwner={isOwner}
              isModerator={isModerator}
              isAdmin={isAdmin}
              showMenu={showServerMenu}
              onToggleMenu={() => setShowServerMenu(!showServerMenu)}
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

            {/* Channel Sidebar */}
            <ChannelSidebar
              infoChannels={serverData.infoChannels}
              textChannels={serverData.textChannels}
              voiceChannels={serverData.voiceChannels}
              selectedChannel={serverData.selectedChannel}
              activeVoiceChannelId={voiceStore.activeChannelId}
              isVoiceConnected={voiceStore.isConnected}
              isVoiceConnecting={voiceStore.isConnecting}
              voiceParticipants={voiceStore.participants}
              channelsLoading={serverData.channelsLoading}
              canManageChannels={isOwner || isAdmin}
              onSelectChannel={handleSelectChannel}
              onVoiceChannelClick={handleVoiceChannelClick}
              onAddChannel={() => setShowCreateChannelModal(true)}
              onAddVoiceChannel={() => setShowCreateChannelModal(true)}
              onEditChannel={(channel) => {
                // TODO: Open edit channel modal
                console.log("Edit channel:", channel);
              }}
              onDeleteChannel={async (channel) => {
                if (confirm(`"${channel.name}" kanalını silmek istediğinize emin misiniz?`)) {
                  try {
                    await import("./serversApi").then(m => m.deleteChannel(serverData.currentServer!.id, channel.id));
                    await serverData.refreshChannels();
                  } catch (err) {
                    console.error("Failed to delete channel:", err);
                  }
                }
              }}
              onEditVoiceChannel={(channel) => {
                // TODO: Open edit voice channel modal
                console.log("Edit voice channel:", channel);
              }}
              onDeleteVoiceChannel={async (channel) => {
                if (confirm(`"${channel.name}" ses kanalını silmek istediğinize emin misiniz?`)) {
                  try {
                    await import("../voice/voiceApi").then(m => m.deleteVoiceChannel(channel.id));
                    await serverData.refreshChannels();
                  } catch (err) {
                    console.error("Failed to delete voice channel:", err);
                  }
                }
              }}
            />

            {/* User Panel */}
            <UserPanel
              user={currentUser}
            />
          </>
        )}
      </div>

      {/* ================================================================
          MAIN CONTENT AREA
      ================================================================ */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!serverData.selectedServer ? (
          /* Discovery Dashboard (Replaces Welcome Screen) */
          <DiscoveryDashboard
            onJoinServer={handleJoinServer}
            onSelectServer={serverData.handleSelectServer}
          />
        ) : showServerProfile && serverData.currentServer ? (
          /* Server Profile View - Inline */
          <ServerProfileView
            server={serverData.currentServer}
            members={members.members}
            isOwner={isOwner}
            isModerator={isModerator || isAdmin}
            onClose={() => setShowServerProfile(false)}
            onSettings={() => {
              setShowServerProfile(false);
              setShowServerSettingsModal(true);
            }}
          />
        ) : isViewingVoiceRoom &&
        voiceStore.activeChannel &&
        serverData.currentServer &&
        voiceStore.activeChannel.serverId === serverData.currentServer.id ? (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">
              {voiceStore.activeChannel.type === "video" ? (
                <VideoRoomView
                  channel={voiceStore.activeChannel}
                  participants={voiceStore.participants}
                  localParticipant={voiceStore.localParticipant}
                  isMuted={voiceStore.isMuted}
                  isCameraOn={voiceStore.isCameraOn}
                  isScreenSharing={voiceStore.isScreenSharing}
                  onToggleMute={voiceStore.toggleMute}
                  onToggleCamera={voiceStore.toggleCamera}
                  onToggleScreenShare={voiceStore.toggleScreenShare}
                  onDisconnect={() => {
                    voiceStore.disconnect();
                    setIsViewingVoiceRoom(false);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col relative pb-[76px] bg-[#0a0a0f]">
                  <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <VolumeIcon className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-zinc-100 truncate">
                        {voiceStore.activeChannel.name}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {voiceStore.participants.length} katılımcı
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {voiceStore.participants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <div className="w-16 h-16 mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                          <VolumeIcon className="w-8 h-8 opacity-60" strokeWidth={1.5} />
                        </div>
                        <p className="text-lg font-medium text-zinc-300">Sesli oda boş</p>
                        <p className="text-sm mt-1">İlk katılımcı siz olun!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {voiceStore.participants.map((p) => (
                          <div
                            key={p.sid}
                            className={`rounded-2xl border border-white/10 bg-white/5 p-4 transition-shadow ${p.isSpeaking
                              ? "shadow-[0_0_0_2px_rgba(34,197,94,0.35)]"
                              : ""
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold ${p.isSpeaking
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                                  }`}
                              >
                                {p.identity[0]?.toUpperCase() || "?"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-zinc-100 truncate">
                                  {p.identity}
                                  {p.isLocal && " (Sen)"}
                                </div>
                                <div className={`text-xs ${p.isSpeaking ? "text-green-400" : "text-zinc-500"}`}>
                                  {p.isSpeaking ? "Konuşuyor" : "Dinliyor"}
                                </div>
                              </div>
                              {p.isMuted && (
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" title="Sessizde" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <VoiceOverlay
                    channel={voiceStore.activeChannel}
                    participants={voiceStore.participants.map((p) => ({
                      sid: p.sid,
                      identity: p.identity,
                      isSpeaking: p.isSpeaking,
                      isMuted: p.isMuted,
                      isLocal: p.isLocal,
                    }))}
                    isMuted={voiceStore.isMuted}
                    isDeafened={voiceStore.isDeafened}
                    isCameraOn={voiceStore.isCameraOn}
                    isScreenSharing={voiceStore.isScreenSharing}
                    onToggleMute={() => {
                      void voiceStore.toggleMute();
                    }}
                    onToggleDeafen={voiceStore.toggleDeafen}
                    onToggleCamera={() => {
                      void voiceStore.toggleCamera();
                    }}
                    onToggleScreenShare={() => {
                      void voiceStore.toggleScreenShare();
                    }}
                    onDisconnect={() => {
                      voiceStore.disconnect();
                      setIsViewingVoiceRoom(false);
                    }}
                  />
                </div>
              )}
            </div>

            {voiceChatChannel && (
              <div className="w-[380px] min-w-[320px] max-w-[420px] border-l border-white/10 bg-[#0a0a0f]/70 backdrop-blur-xl flex flex-col min-h-0">
                <div className="flex-1 flex flex-col relative min-h-0">
                  <ChatArea
                    channel={voiceChatChannel}
                    messages={voiceChatMessages.messages}
                    messagesLoading={voiceChatMessages.messagesLoading}
                    sending={voiceChatMessages.sending}
                    messageText={voiceChatMessages.messageText}
                    messagesEndRef={voiceChatMessages.messagesEndRef}
                    onMessageChange={voiceChatMessages.setMessageText}
                    onSend={voiceChatMessages.handleSend}
                    onEditMessage={voiceChatMessages.handleEdit}
                    onDeleteMessage={voiceChatMessages.handleDelete}
                    onTyping={voiceChatMessages.handleTyping}
                    typingUsers={voiceChatMessages.typingUsers}
                    variant="panel"
                    headerIcon={
                      voiceStore.activeChannel.type === "video" ? (
                        <VideoIcon className="w-5 h-5 text-red-400" />
                      ) : (
                        <VolumeIcon className="w-5 h-5 text-green-400" />
                      )
                    }
                    headerBadge={
                      voiceStore.activeChannel.type === "video" ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-xs font-medium">
                          LIVE
                        </span>
                      ) : null
                    }
                  />
                </div>
              </div>
            )}
          </div>
        ) : serverData.currentChannel ? (
          <div
            className={`flex-1 flex flex-col relative ${serverData.currentServer &&
              voiceStore.activeChannel &&
              voiceStore.activeChannel.serverId === serverData.currentServer.id &&
              (voiceStore.isConnected || voiceStore.isConnecting)
              ? "pb-[76px]"
              : ""
              }`}
          >
            <ChatArea
              channel={serverData.currentChannel}
              messages={chatMessages.messages}
              messagesLoading={chatMessages.messagesLoading}
              sending={chatMessages.sending}
              messageText={chatMessages.messageText}
              messagesEndRef={chatMessages.messagesEndRef}
              onMessageChange={chatMessages.setMessageText}
              onSend={chatMessages.handleSend}
              onEditMessage={chatMessages.handleEdit}
              onDeleteMessage={chatMessages.handleDelete}
              onTyping={chatMessages.handleTyping}
              typingUsers={chatMessages.typingUsers}
            />
            {serverData.currentServer &&
              voiceStore.activeChannel &&
              voiceStore.activeChannel.serverId === serverData.currentServer.id &&
              (voiceStore.isConnected || voiceStore.isConnecting) && (
                <VoiceOverlay
                  channel={voiceStore.activeChannel}
                  participants={voiceStore.participants.map((p) => ({
                    sid: p.sid,
                    identity: p.identity,
                    isSpeaking: p.isSpeaking,
                    isMuted: p.isMuted,
                    isLocal: p.isLocal,
                  }))}
                  isMuted={voiceStore.isMuted}
                  isDeafened={voiceStore.isDeafened}
                  isCameraOn={voiceStore.isCameraOn}
                  isScreenSharing={voiceStore.isScreenSharing}
                  onToggleMute={() => {
                    void voiceStore.toggleMute();
                  }}
                  onToggleDeafen={voiceStore.toggleDeafen}
                  onToggleCamera={() => {
                    void voiceStore.toggleCamera();
                  }}
                  onToggleScreenShare={() => {
                    void voiceStore.toggleScreenShare();
                  }}
                  onDisconnect={() => {
                    voiceStore.disconnect();
                    setIsViewingVoiceRoom(false);
                  }}
                />
              )}
          </div>
        ) : (
          /* No Channel Selected */
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Bir kanal seçin</p>
              <p className="text-sm mt-1">veya yeni bir kanal oluşturun</p>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          RIGHT SIDEBAR - Members Panel
      ================================================================ */}
      {serverData.currentServer && serverData.currentChannel && !isViewingVoiceRoom && (
        <MembersPanel
          members={members.members}
          membersByRole={members.membersByRole}
          loading={members.loading}
        />
      )}

      {/* ================================================================
          MODALS
      ================================================================ */}

      {/* Members Modal */}
      {serverData.currentServer && (
        <MembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          serverId={serverData.currentServer.id}
          serverName={serverData.currentServer.name}
          ownerId={serverData.currentServer.ownerId}
          isAdmin={isAdmin}
          isModerator={isModerator}
        />
      )}

      {/* Create Channel Modal */}
      {serverData.currentServer && (
        <CreateChannelModal
          isOpen={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          serverId={serverData.currentServer.id}
          onChannelCreated={() => {
            setShowCreateChannelModal(false);
          }}
        />
      )}

      {/* Create Server Modal */}
      <CreateServerModal
        isOpen={showCreateServerModal}
        onClose={() => setShowCreateServerModal(false)}
        onServerCreated={(serverId: string) => {
          setShowCreateServerModal(false);
          serverData.handleSelectServer(serverId);
        }}
      />

      {/* Explore Servers Modal */}
      <ExploreServersModal
        isOpen={showExploreModal}
        onClose={() => setShowExploreModal(false)}
        onJoin={(serverId: string) => {
          handleJoinServer(serverId);
        }}
      />

      {/* Server Settings Modal */}
      {serverData.currentServer && (
        <ServerSettingsModal
          isOpen={showServerSettingsModal}
          onClose={() => setShowServerSettingsModal(false)}
          server={serverData.currentServer}
          onServerUpdated={() => {
            setShowServerSettingsModal(false);
          }}
          onServerDeleted={() => {
            setShowServerSettingsModal(false);
            navigate("/servers");
          }}
        />
      )}
    </div>
  );
}
