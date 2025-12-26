import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getServer, getServerMembers, joinServer } from "./serversApi";
import type { Server, ServerMember } from "../../api/types";
import { serverKeys } from "../../lib/query";
import { useAuthStore } from "../../store/authStore";

export function ServerProfilePage() {
    const { serverId } = useParams<{ serverId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);

    const [server, setServer] = useState<Server | null>(null);
    const [members, setMembers] = useState<ServerMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [joinRequestPending, setJoinRequestPending] = useState(false);

    useEffect(() => {
        if (!serverId) return;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [serverData, memberData] = await Promise.all([
                    getServer(serverId!),
                    getServerMembers(serverId!).catch(() => []),
                ]);
                setServer(serverData);
                setMembers(memberData);
                // Check if current user is a member
                const userIsMember = memberData.some(
                    (m: any) => m.userId === currentUser?.id || m.user?.id === currentUser?.id
                );
                setIsMember(userIsMember);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load server");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [serverId, currentUser?.id]);

    const handleJoin = async () => {
        if (!serverId) return;
        setJoining(true);
        setJoinRequestPending(false);
        try {
            const result = await joinServer(serverId);
            await queryClient.invalidateQueries({ queryKey: serverKeys.all });
            if (result.pending) {
                setJoinRequestPending(true);
                return;
            }
            setIsMember(true);
            navigate(`/servers/${serverId}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to join server");
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                    <p className="text-zinc-500 text-sm">Loading server profile...</p>
                </div>
            </div>
        );
    }

    if (error || !server) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-zinc-100 mb-2">Server Not Found</h2>
                    <p className="text-zinc-500 mb-4">{error || "This server doesn't exist or you don't have access."}</p>
                    <button
                        onClick={() => navigate("/servers")}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-zinc-200 rounded-lg transition-colors"
                    >
                        Back to Servers
                    </button>
                </div>
            </div>
        );
    }

    const onlineMembers = members.filter((m: any) => m.isOnline || m.user?.isOnline);
    const isOwner = server.ownerId === currentUser?.id;

    return (
        <div className="flex h-full bg-[#0a0a0f]">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Banner */}
                <div
                    className="h-48 relative"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#1a1a2e"}, ${server.iconGradient?.[1] || "#16213e"})`,
                    }}
                >
                    {/* Server Icon */}
                    <div className="absolute -bottom-12 left-8">
                        <div
                            className="w-24 h-24 rounded-2xl border-4 border-[#0a0a0f] flex items-center justify-center text-white text-3xl font-bold shadow-xl"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                            }}
                        >
                            {server.name?.[0]?.toUpperCase() || "?"}
                        </div>
                    </div>
                </div>

                {/* Server Info */}
                <div className="px-8 pt-16 pb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-100 mb-1">{server.name}</h1>
                            <p className="text-zinc-500 flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    {onlineMembers.length} online
                                </span>
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    {members.length} members
                                </span>
                                {server.isPublic && (
                                    <span className="flex items-center gap-1 text-indigo-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Public
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                            {isMember ? (
                                <button
                                    onClick={() => navigate(`/servers/${server.id}`)}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all"
                                >
                                    Open Server
                                </button>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={joining || joinRequestPending}
                                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
                                >
                                    {joining ? "Joining..." : joinRequestPending ? "Request Sent" : "Join Server"}
                                </button>
                            )}
                            <button
                                onClick={() => navigate(-1)}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    </div>

                    {joinRequestPending && (
                        <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
                            Katılma isteği gönderildi. Onay bekleniyor.
                        </div>
                    )}

                    {/* Description */}
                    {server.description && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                About
                            </h2>
                            <p className="text-zinc-300">{server.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-zinc-100 mb-1">{members.length}</div>
                            <div className="text-sm text-zinc-500">Total Members</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-green-400 mb-1">{onlineMembers.length}</div>
                            <div className="text-sm text-zinc-500">Online Now</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-zinc-100 mb-1">
                                {new Date(server.createdAt || Date.now()).toLocaleDateString("tr-TR", { month: "short", year: "numeric" })}
                            </div>
                            <div className="text-sm text-zinc-500">Created</div>
                        </div>
                    </div>

                    {/* Owner Info */}
                    {isOwner && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-indigo-300">You own this server</div>
                                    <div className="text-xs text-zinc-500">You have full control over this server</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Members Sidebar */}
            <div className="w-64 bg-[#0f0f15]/80 border-l border-white/5 p-4 shrink-0">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Members — {members.length}
                </h3>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {members.slice(0, 20).map((member: any) => {
                        const user = member.user || member;
                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <div
                                    className="w-8 h-8 rounded-full shrink-0"
                                    style={{
                                        backgroundImage: user.avatarGradient && user.avatarGradient.length === 2
                                            ? `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`
                                            : "linear-gradient(135deg, #333, #666)",
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-zinc-200 truncate">
                                        {user.displayName || user.handle || "Unknown"}
                                    </div>
                                    {member.role === "owner" && (
                                        <div className="text-xs text-amber-400">Owner</div>
                                    )}
                                    {member.role === "admin" && (
                                        <div className="text-xs text-indigo-400">Admin</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {members.length > 20 && (
                        <div className="text-xs text-zinc-500 text-center py-2">
                            +{members.length - 20} more members
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
