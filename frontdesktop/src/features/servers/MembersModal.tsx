// ============================================================================
// Server Members Modal Component
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { getServerMembers, removeMember } from "./serversApi";
import { useAuthStore } from "../../store/authStore";

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

export function MembersModal({
    isOpen,
    onClose,
    serverId,
    serverName,
    ownerId,
}: MembersModalProps) {
    const currentUser = useAuthStore((s) => s.user);
    const [members, setMembers] = useState<MemberWithUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Permission checks based on server ownership
    const isOwner = currentUser?.id === ownerId;
    const canManageMembers = isOwner; // For now, only owner can kick

    // Load members
    useEffect(() => {
        if (!isOpen) return;

        const loadMembers = async () => {
            setLoading(true);
            try {
                const data = await getServerMembers(serverId);
                // Transform data to MemberWithUser format
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
        };

        loadMembers();
    }, [isOpen, serverId]);

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
                        <p className="text-sm text-zinc-500">{members.length} üye</p>
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

                {/* Members List */}
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : sortedMembers.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="font-medium">Üye bulunamadı</p>
                        </div>
                    ) : (
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
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#0a0a10]">
                    <p className="text-xs text-zinc-500 text-center">
                        {canManageMembers
                            ? "Üyeleri yönetebilirsiniz"
                            : "Üye listesini görüntülüyorsunuz"}
                    </p>
                </div>
            </div>
        </div>
    );
}
