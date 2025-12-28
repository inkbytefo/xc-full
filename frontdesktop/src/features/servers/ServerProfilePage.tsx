import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useServer, useServerMembers, useJoinServer, serverKeys } from "../../lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import type { ServerMember } from "../../api/types";

export function ServerProfilePage() {
    const { serverId } = useParams<{ serverId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);

    // Join request pending state (local only)
    const [joinRequestPending, setJoinRequestPending] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    // React Query hooks
    const {
        data: server,
        isLoading: serverLoading,
        error: serverError,
    } = useServer(serverId ?? null);

    const {
        data: members = [],
        isLoading: membersLoading,
    } = useServerMembers(serverId ?? null);

    // Join server mutation
    const joinServerMutation = useJoinServer();

    // Derived state
    const loading = serverLoading || membersLoading;
    const error = serverError ? (serverError instanceof Error ? serverError.message : "Failed to load server") : null;

    const isMember = useMemo(() => {
        return members.some((m) => m.userId === currentUser?.id || m.user?.id === currentUser?.id);
    }, [members, currentUser?.id]);

    const isOwner = server?.ownerId === currentUser?.id;
    const onlineMembers = useMemo(() => {
        const hasOnline = (m: ServerMember): boolean => {
            const maybe = m as unknown as { isOnline?: boolean; user?: { isOnline?: boolean } };
            return !!maybe.isOnline || !!maybe.user?.isOnline;
        };
        return members.filter((m) => hasOnline(m));
    }, [members]);

    const handleJoin = async () => {
        if (!serverId) return;
        setJoinError(null);
        setJoinRequestPending(false);
        try {
            const result = await joinServerMutation.mutateAsync(serverId);
            await queryClient.invalidateQueries({ queryKey: serverKeys.all });
            if (result.pending) {
                setJoinRequestPending(true);
                return;
            }
            navigate(`/servers/${serverId}`);
        } catch (e) {
            setJoinError(e instanceof Error ? e.message : "Sunucuya katılınamadı");
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                    <p className="text-zinc-500 text-sm">Sunucu profili yükleniyor...</p>
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
                    <h2 className="text-xl font-semibold text-zinc-100 mb-2">Sunucu Bulunamadı</h2>
                    <p className="text-zinc-500 mb-4">{error || "Bu sunucu yok veya erişiminiz yok."}</p>
                    <button
                        onClick={() => navigate("/servers")}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-zinc-200 rounded-lg transition-colors"
                    >
                        Sunuculara Dön
                    </button>
                </div>
            </div>
        );
    }

    const createdAtLabel = (() => {
        if (!server.createdAt) return "Bilinmiyor";
        const d = new Date(server.createdAt);
        if (Number.isNaN(d.getTime())) return "Bilinmiyor";
        return d.toLocaleDateString("tr-TR", { month: "short", year: "numeric" });
    })();

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
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {server.tag && (
                                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold tracking-wide">
                                            {server.tag}
                                        </span>
                                    )}
                                    {server.handle && (
                                        <span className="text-zinc-500 text-sm">
                                            /s/{server.handle}
                                        </span>
                                    )}
                                </div>
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
                                        Herkese Açık
                                    </span>
                                )}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                            {isMember ? (
                                <button
                                    onClick={() => navigate(`/servers/${server.id}`)}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all"
                                >
                                    Sunucuyu Aç
                                </button>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={joinServerMutation.isPending || joinRequestPending}
                                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
                                >
                                    {joinServerMutation.isPending ? "Katılınıyor..." : joinRequestPending ? "İstek Gönderildi" : "Katıl"}
                                </button>
                            )}
                            <button
                                onClick={() => navigate(-1)}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"
                            >
                                Geri
                            </button>
                        </div>
                    </div>

                    {joinRequestPending && (
                        <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
                            Katılma isteği gönderildi. Onay bekleniyor.
                        </div>
                    )}

                    {joinError && (
                        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                            {joinError}
                        </div>
                    )}

                    {/* Description */}
                    {server.description && (
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                Hakkında
                            </h2>
                            <p className="text-zinc-300">{server.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-zinc-100 mb-1">{members.length}</div>
                            <div className="text-sm text-zinc-500">Üye</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-green-400 mb-1">{onlineMembers.length}</div>
                            <div className="text-sm text-zinc-500">Çevrimiçi</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-zinc-100 mb-1">{createdAtLabel}</div>
                            <div className="text-sm text-zinc-500">Kuruluş</div>
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
                                    <div className="text-sm font-medium text-indigo-300">Bu sunucunun sahibisiniz</div>
                                    <div className="text-xs text-zinc-500">Tüm yetkiler sizde</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 lg:hidden">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                            Üyeler — {members.length}
                        </h3>
                        <div className="space-y-2">
                            {members.slice(0, 12).map((member) => {
                                const user = member.user;
                                const avatarGradient = user?.avatarGradient ?? ["#333", "#666"];
                                const displayName = user?.displayName ?? user?.handle ?? "Kullanıcı";
                                const role = member.role;

                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full shrink-0"
                                            style={{
                                                backgroundImage:
                                                    avatarGradient.length === 2
                                                        ? `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`
                                                        : "linear-gradient(135deg, #333, #666)",
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-zinc-200 truncate">{displayName}</div>
                                            {(role === "owner" || role === "admin" || role === "moderator") && (
                                                <div className="text-xs text-zinc-500">
                                                    {role === "owner" ? "Sahip" : role === "admin" ? "Admin" : "Moderatör"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {members.length > 12 && (
                                <div className="text-xs text-zinc-500 text-center py-2">
                                    +{members.length - 12} üye daha
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Members Sidebar */}
            <div className="hidden lg:block w-64 bg-[#0f0f15]/80 border-l border-white/5 p-4 shrink-0">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Üyeler — {members.length}
                </h3>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {members.slice(0, 20).map((member) => {
                        const user = member.user;
                        const avatarGradient = user?.avatarGradient ?? ["#333", "#666"];
                        const displayName = user?.displayName ?? user?.handle ?? "Kullanıcı";
                        const role = member.role;
                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <div
                                    className="w-8 h-8 rounded-full shrink-0"
                                    style={{
                                        backgroundImage:
                                            avatarGradient.length === 2
                                                ? `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`
                                                : "linear-gradient(135deg, #333, #666)",
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-zinc-200 truncate">
                                        {displayName}
                                    </div>
                                    {role === "owner" && (
                                        <div className="text-xs text-amber-400">Sahip</div>
                                    )}
                                    {role === "admin" && (
                                        <div className="text-xs text-indigo-400">Admin</div>
                                    )}
                                    {role === "moderator" && (
                                        <div className="text-xs text-purple-300">Moderatör</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {members.length > 20 && (
                        <div className="text-xs text-zinc-500 text-center py-2">
                            +{members.length - 20} üye daha
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
