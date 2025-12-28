import { useMemo } from "react";
import type { Channel, Server } from "../../../api/types";
import type { ServerMember } from "./useServerMembers";

interface UseServerPermissionsParams {
  currentUserId: string | undefined;
  server: Server | undefined;
  channel: Channel | undefined;
  members: ServerMember[];
}

interface UseServerPermissionsResult {
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canSendInChannel: boolean;
}

export function useServerPermissions({
  currentUserId,
  server,
  channel,
  members,
}: UseServerPermissionsParams): UseServerPermissionsResult {
  return useMemo(() => {
    const isOwner = !!server && !!currentUserId && server.ownerId === currentUserId;

    const myMembership = currentUserId ? members.find((m) => m.userId === currentUserId) : undefined;
    const role = myMembership?.role;

    const isAdmin = isOwner || role === "admin" || role === "owner";
    const isModerator = role === "moderator";

    const canSendInChannel = (() => {
      if (!channel) return false;
      if (isOwner) return true;
      if (channel.type === "announcement") return isAdmin || isModerator;
      return true;
    })();

    return { isOwner, isAdmin, isModerator, canSendInChannel };
  }, [channel, currentUserId, members, server]);
}

