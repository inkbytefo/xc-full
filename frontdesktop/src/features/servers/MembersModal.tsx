// ============================================================================
// Server Members Modal Component
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import {
    acceptServerJoinRequest,
    getServerJoinRequests,
    getServerMembers,
    rejectServerJoinRequest,
    removeMember,
    type ServerJoinRequest,
} from "./serversApi";
import { useAuthStore } from "../../store/authStore";
import { getUser, type UserProfile } from "../profile/userApi";

interface MemberWithUser {
    id: string;
    memberId: string;
    userId: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
    role: string; // Display role (highest role name)
    joinedAt: string;
}

interface MembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    serverName: string;
    ownerId?: string; // Server owner ID for permission checks
    isAdmin?: boolean;
    isModerator?: boolean;
}

// Role display configuration
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; order: number }> = {
    owner: { label: "Sahip", color: "text-yellow-400", bg: "bg-yellow-500/20", order: 0 },
    admin: { label: "Yönetici", color: "text-purple-400", bg: "bg-purple-500/20", order: 1 },
    moderator: { label: "Moderatör", color: "text-blue-400", bg: "bg-blue-500/20", order: 2 },
    member: { label: "Üye", color: "text-zinc-400", bg: "bg-zinc-500/20", order: 3 },
    "@everyone": { label: "Üye", color: "text-zinc-400", bg: "bg-zinc-500/20", order: 3 },
};

function getRoleConfig(role: string) {
    return ROLE_CONFIG[role.toLowerCase()] || ROLE_CONFIG.member;
}

type MembersTab = "members" | "joinRequests";

type JoinRequestWithUser = ServerJoinRequest & {
    user?: UserProfile;
};

export function MembersModal({
    isOpen,
    onClose,
    serverId,
    serverName,
    ownerId,
    isAdmin = false,
    isModerator = false,
}: MembersModalProps) {
    const currentUser = useAuthStore((s) => s.user);
    const [activeTab, setActiveTab] = useState<MembersTab>("members");
    const [members, setMembers] = useState<MemberWithUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [joinRequests, setJoinRequests] = useState<JoinRequestWithUser[]>([]);
    const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
    const [joinRequestActionLoading, setJoinRequestActionLoading] = useState<Record<string, boolean>>({});
    const [userCache, setUserCache] = useState<Record<string, UserProfile>>({});

    // Permission checks based on server ownership
    const isOwner = currentUser?.id === ownerId;
    const canManageMembers = isOwner; // For now, only owner can kick
    const canManageJoinRequests = isOwner || isAdmin || isModerator;

    const loadMembers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getServerMembers(serverId);
            const membersWithUser: MemberWithUser[] = data.map((m) => ({
                id: m.id,
                memberId: m.id,
                userId: m.userId,
                handle: m.user?.handle || "user",
                displayName: m.user?.displayName || "User",
                avatarGradient: m.user?.avatarGradient || ["#667eea", "#764ba2"],
                role: m.role || "member",
                joinedAt: m.joinedAt,
            }));
            setMembers(membersWithUser);
        } catch (err) {
            console.error("Failed to load members:", err);
        } finally {
            setLoading(false);
        }
    }, [serverId]);

    const loadJoinRequests = useCallback(async () => {
        if (!canManageJoinRequests) return;

        setJoinRequestsLoading(true);
        try {
            const requests = await getServerJoinRequests(serverId);
            const missingUserIds = requests.map((r) => r.userId).filter((id) => userCache[id] === undefined);

            let nextCache = userCache;
            if (missingUserIds.length > 0) {
                const results = await Promise.allSettled(missingUserIds.map((id) => getUser(id)));
                nextCache = { ...userCache };
                results.forEach((r, idx) => {
                    if (r.status === "fulfilled") {
                        nextCache[missingUserIds[idx]] = r.value;
                    }
                });
                setUserCache(nextCache);
            }

            const nextJoinRequests: JoinRequestWithUser[] = requests.map((r) => ({
                ...r,
                user: nextCache[r.userId],
            }));
            setJoinRequests(nextJoinRequests);
        } catch (err) {
            console.error("Failed to load join requests:", err);
        } finally {
            setJoinRequestsLoading(false);
        }
    }, [canManageJoinRequests, serverId, userCache]);

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab("members");
        loadMembers();
    }, [isOpen, loadMembers]);

    useEffect(() => {
        if (!isOpen) return;
        if (activeTab !== "joinRequests") return;
        loadJoinRequests();
    }, [activeTab, isOpen, loadJoinRequests]);

    const handleKick = useCallback(async (userId: string) => {
        if (!confirm("Bu üyeyi sunucudan çıkarmak istediğinize emin misiniz?")) return;

        setActionLoading((prev) => ({ ...prev, [userId]: true }));

        try {
            await removeMember(serverId, userId);
            setMembers((prev) => prev.filter((m) => m.userId !== userId));
        } catch (err) {
            console.error("Failed to kick member:", err);
        } finally {
            setActionLoading((prev) => ({ ...prev, [userId]: false }));
        }
    }, [serverId]);

    const handleAcceptJoinRequest = useCallback(async (userId: string) => {
        setJoinRequestActionLoading((prev) => ({ ...prev, [userId]: true }));
        try {
            await acceptServerJoinRequest(serverId, userId);
            await Promise.all([loadJoinRequests(), loadMembers()]);
        } catch (err) {
            console.error("Failed to accept join request:", err);
        } finally {
            setJoinRequestActionLoading((prev) => ({ ...prev, [userId]: false }));
        }
    }, [loadJoinRequests, loadMembers, serverId]);

    const handleRejectJoinRequest = useCallback(async (userId: string) => {
        setJoinRequestActionLoading((prev) => ({ ...prev, [userId]: true }));
        try {
            await rejectServerJoinRequest(serverId, userId);
            await loadJoinRequests();
        } catch (err) {
            console.error("Failed to reject join request:", err);
        } finally {
            setJoinRequestActionLoading((prev) => ({ ...prev, [userId]: false }));
        }
    }, [loadJoinRequests, serverId]);

    if (!isOpen) return null;

    // Sort: by role order (owner first, then admin, etc.)
    const sortedMembers = [...members].sort((a, b) => {
        const orderA = getRoleConfig(a.role).order;
        const orderB = getRoleConfig(b.role).order;
        return orderA - orderB;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">{serverName}</h3>
                        <p className="text-sm text-zinc-500">
                            {activeTab === "members" ? `${members.length} üye` : `${joinRequests.length} istek`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {canManageJoinRequests && (
                    <div className="px-4 py-3 border-b border-white/10 bg-[#0a0a10] flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab("members")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "members"
                                ? "bg-white/10 text-zinc-100"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                }`}
                        >
                            Üyeler
                        </button>
                        <button
                            onClick={() => setActiveTab("joinRequests")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "joinRequests"
                                ? "bg-white/10 text-zinc-100"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                }`}
                        >
                            Katılma İstekleri
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="max-h-96 overflow-y-auto">
                    {activeTab === "members" && loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : activeTab === "members" && sortedMembers.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="font-medium">Üye bulunamadı</p>
                        </div>
                    ) : activeTab === "members" ? (
                        sortedMembers.map((member) => {
                            const isMe = member.userId === currentUser?.id;
                            const isMemberOwner = member.userId === ownerId;
                            const canKickThis = canManageMembers && !isMemberOwner && !isMe;
                            const roleConfig = getRoleConfig(isMemberOwner ? "owner" : member.role);

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                                >
                                    {/* Avatar */}
                                    <div
                                        className="w-10 h-10 rounded-full shrink-0"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, ${member.avatarGradient[0]}, ${member.avatarGradient[1]})`,
                                        }}
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white truncate">{member.displayName}</span>
                                            {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">SEN</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-zinc-500">@{member.handle}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className={roleConfig.color}>{roleConfig.label}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 relative">
                                        {/* Role Badge */}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${roleConfig.bg} ${roleConfig.color}`}>
                                            {roleConfig.label}
                                        </span>

                                        {/* Kick Button */}
                                        {canKickThis && (
                                            <button
                                                onClick={() => handleKick(member.userId)}
                                                disabled={actionLoading[member.userId]}
                                                className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                                                title="Sunucudan çıkar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : joinRequestsLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : joinRequests.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="font-medium">Bekleyen istek yok</p>
                        </div>
                    ) : (
                        joinRequests.map((req) => {
                            const user = req.user;
                            const displayName = user?.displayName ?? req.userId;
                            const handle = user?.handle ?? "user";
                            const avatarGradient = user?.avatarGradient ?? ["#667eea", "#764ba2"];
                            const disabled = joinRequestActionLoading[req.userId] === true;

                            return (
                                <div
                                    key={req.userId}
                                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full shrink-0"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`,
                                        }}
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white truncate">{displayName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <span className="truncate">@{handle}</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="text-zinc-600">
                                                {new Date(req.createdAt).toLocaleString("tr-TR")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRejectJoinRequest(req.userId)}
                                            disabled={disabled}
                                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition-colors disabled:opacity-50"
                                        >
                                            Reddet
                                        </button>
                                        <button
                                            onClick={() => handleAcceptJoinRequest(req.userId)}
                                            disabled={disabled}
                                            className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-300 text-sm transition-colors disabled:opacity-50"
                                        >
                                            Kabul Et
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#0a0a10]">
                    <p className="text-xs text-zinc-500 text-center">
                        {activeTab === "joinRequests"
                            ? canManageJoinRequests
                                ? "Katılma isteklerini yönetebilirsiniz"
                                : "Bu alanı görüntüleme yetkiniz yok"
                            : canManageMembers
                                ? "Üyeleri yönetebilirsiniz"
                                : "Üye listesini görüntülüyorsunuz"}
                    </p>
                </div>
            </div>
        </div>
    );
}
