import { useEffect, useMemo, useState } from "react";
import { getServerMembers } from "../serversApi";

export interface ServerMember {
    id: string;
    userId: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
    role: "owner" | "admin" | "moderator" | "member" | string;
    roleIds?: string[];
    isOnline?: boolean;
    status?: string;
    user?: {
        id: string;
        displayName: string;
        handle: string;
    };
}

interface MembersByRole {
    admin: ServerMember[];
    moderator: ServerMember[];
    online: ServerMember[];
    offline: ServerMember[];
}

interface UseServerMembersOptions {
    serverId: string | null;
    onError?: (message: string) => void;
}

interface UseServerMembersReturn {
    members: ServerMember[];
    membersByRole: MembersByRole;
    loading: boolean;
}

export function useServerMembers({
    serverId,
    onError,
}: UseServerMembersOptions): UseServerMembersReturn {
    const [members, setMembers] = useState<ServerMember[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!serverId) {
            setMembers([]);
            return;
        }

        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const memberData = await getServerMembers(serverId!);
                if (!cancelled) {
                    const safeMemberData = Array.isArray(memberData) ? memberData : [];
                    const mappedMembers = safeMemberData.map((m: any) => {
                        const user = m.user;
                        const hasValidGradient =
                            user?.avatarGradient &&
                            Array.isArray(user.avatarGradient) &&
                            user.avatarGradient.length === 2;

                        return {
                            id: m.id,
                            userId: m.userId || user?.id,
                            handle: user?.handle || "user",
                            displayName: user?.displayName || "User",
                            avatarGradient: hasValidGradient
                                ? user.avatarGradient
                                : ["#e4e4e7", "#3f3f46"],
                            role: m.role,
                            roleIds: m.roleIds,
                            isOnline: false,
                            status: "",
                            user: user ? {
                                id: user.id || m.userId,
                                displayName: user.displayName,
                                handle: user.handle
                            } : undefined,
                        };
                    });
                    setMembers(mappedMembers as ServerMember[]);
                    setLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    onError?.(e instanceof Error ? e.message : "Üyeler yüklenemedi");
                    setLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [serverId, onError]);

    const membersByRole = useMemo<MembersByRole>(
        () => ({
            admin: members.filter((m) => m.role === "owner" || m.role === "admin"),
            moderator: members.filter((m) => m.role === "moderator"),
            online: members.filter((m) => m.role === "member" && m.isOnline),
            offline: members.filter((m) => m.role === "member" && !m.isOnline),
        }),
        [members]
    );

    return {
        members,
        membersByRole,
        loading,
    };
}
