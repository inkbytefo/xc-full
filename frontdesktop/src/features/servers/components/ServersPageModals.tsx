import { useCallback } from "react";
import type { Channel, Server } from "../../../api/types";
import { CreateChannelModal } from "../CreateChannelModal";
import { CreateServerModal } from "../CreateServerModal";
import { ExploreServersModal } from "../ExploreServersModal";
import { MembersModal } from "../MembersModal";
import { ServerSettingsModal } from "../ServerSettingsModal";
import { EditChannelModal } from "./EditChannelModal";
import { InviteServerModal } from "./InviteServerModal";

interface ServersPageModalsProps {
  currentServer: Server | undefined;
  categories: Channel[];
  refreshChannels: () => Promise<void>;
  handleServerCreated: (newServerId: string) => Promise<void>;
  setServers: React.Dispatch<React.SetStateAction<Server[]>>;
  setSelectedServer: (serverId: string | null) => void;

  isAdmin: boolean;
  isModerator: boolean;

  showExploreModal: boolean;
  setShowExploreModal: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateServerModal: boolean;
  setShowCreateServerModal: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateChannelModal: boolean;
  setShowCreateChannelModal: React.Dispatch<React.SetStateAction<boolean>>;
  showServerSettingsModal: boolean;
  setShowServerSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  showMembersModal: boolean;
  setShowMembersModal: React.Dispatch<React.SetStateAction<boolean>>;
  showInviteModal: boolean;
  setShowInviteModal: React.Dispatch<React.SetStateAction<boolean>>;

  editingChannel: Channel | null;
  setEditingChannel: React.Dispatch<React.SetStateAction<Channel | null>>;

  onJoinServer: (serverId: string) => Promise<void>;
  onNavigate: (path: string) => void;
}

export function ServersPageModals({
  currentServer,
  categories,
  refreshChannels,
  handleServerCreated,
  setServers,
  setSelectedServer,
  isAdmin,
  isModerator,
  showExploreModal,
  setShowExploreModal,
  showCreateServerModal,
  setShowCreateServerModal,
  showCreateChannelModal,
  setShowCreateChannelModal,
  showServerSettingsModal,
  setShowServerSettingsModal,
  showMembersModal,
  setShowMembersModal,
  showInviteModal,
  setShowInviteModal,
  editingChannel,
  setEditingChannel,
  onJoinServer,
  onNavigate,
}: ServersPageModalsProps) {
  const handleServerUpdated = useCallback(
    (updated: Server) => {
      setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    },
    [setServers]
  );

  const handleServerDeleted = useCallback(() => {
    if (!currentServer) return;
    setServers((prev) => prev.filter((s) => s.id !== currentServer.id));
    setSelectedServer(null);
    onNavigate("/servers");
  }, [currentServer, onNavigate, setSelectedServer, setServers]);

  const handleOpenProfileFromInvite = useCallback(() => {
    if (!currentServer) return;
    onNavigate(currentServer.handle ? `/s/${currentServer.handle}` : `/servers/${currentServer.id}`);
    setShowInviteModal(false);
  }, [currentServer, onNavigate, setShowInviteModal]);

  return (
    <>
      <ExploreServersModal
        isOpen={showExploreModal}
        onClose={() => setShowExploreModal(false)}
        onJoin={onJoinServer}
      />

      <CreateServerModal
        isOpen={showCreateServerModal}
        onClose={() => setShowCreateServerModal(false)}
        onServerCreated={handleServerCreated}
      />

      <EditChannelModal
        isOpen={editingChannel !== null}
        serverId={currentServer?.id ?? null}
        channel={editingChannel}
        categories={categories}
        onClose={() => setEditingChannel(null)}
        onSaved={refreshChannels}
      />

      <InviteServerModal
        isOpen={showInviteModal}
        server={currentServer}
        onClose={() => setShowInviteModal(false)}
        onOpenProfile={handleOpenProfileFromInvite}
      />

      {currentServer && (
        <>
          <CreateChannelModal
            isOpen={showCreateChannelModal}
            onClose={() => setShowCreateChannelModal(false)}
            serverId={currentServer.id}
            onChannelCreated={refreshChannels}
          />

          <ServerSettingsModal
            isOpen={showServerSettingsModal}
            onClose={() => setShowServerSettingsModal(false)}
            server={currentServer}
            onServerUpdated={handleServerUpdated}
            onServerDeleted={handleServerDeleted}
          />

          <MembersModal
            isOpen={showMembersModal}
            onClose={() => setShowMembersModal(false)}
            serverId={currentServer.id}
            serverName={currentServer.name}
            ownerId={currentServer.ownerId}
            isAdmin={isAdmin}
            isModerator={isModerator}
          />
        </>
      )}
    </>
  );
}

