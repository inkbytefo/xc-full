import { useCallback, useEffect, useState } from "react";
import type { Notification } from "../../api/types";
import { fetchNotifications, markAllAsRead } from "./notificationsApi";
import { getFollowRequests, acceptFollowRequest, rejectFollowRequest, type UserProfile } from "../profile/userApi";

// ============================================================================
// Helpers
// ============================================================================

function formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa önce`;
    return `${Math.floor(hours / 24)}g önce`;
}

// ============================================================================
// Follow Request Item
// ============================================================================

interface FollowRequestItemProps {
    user: UserProfile;
    onAccept: () => void;
    onReject: () => void;
    loading?: boolean;
    accepted?: boolean;
}

function FollowRequestItem({ user, onAccept, onReject, loading, accepted }: FollowRequestItemProps) {
    return (
        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors">
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                    className="w-10 h-10 rounded-full shrink-0"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
                    }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-zinc-100">
                        <span className="font-medium">{user.displayName}</span>{" "}
                        <span className="text-zinc-400">
                            {accepted ? "seni takip etmeye başladı" : "seni takip etmek istiyor"}
                        </span>
                    </p>
                    <p className="text-sm text-zinc-500">@{user.handle}</p>
                </div>

                {/* Actions */}
                {!accepted && (
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={onAccept}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? "..." : "Onayla"}
                        </button>
                        <button
                            onClick={onReject}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Reddet
                        </button>
                    </div>
                )}

                {/* Accepted badge */}
                {accepted && (
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-medium">
                        ✓ Onaylandı
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Notifications Page
// ============================================================================

export function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [followRequests, setFollowRequests] = useState<UserProfile[]>([]);
    const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Load notifications and follow requests on mount
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [notifRes, requestsRes] = await Promise.all([
                    fetchNotifications(),
                    getFollowRequests(),
                ]);
                if (!cancelled) {
                    setNotifications(notifRes.data);
                    setFollowRequests(requestsRes.data || []);
                    setLoading(false);
                }
            } catch (e) {
                console.error("Failed to load notifications:", e);
                setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (e) {
            console.error("Failed to mark all as read:", e);
        }
    }, []);

    const handleAccept = useCallback(async (userId: string) => {
        setLoadingIds((prev) => new Set(prev).add(userId));
        try {
            await acceptFollowRequest(userId);
            setAcceptedIds((prev) => new Set(prev).add(userId));
        } catch (e) {
            console.error("Failed to accept:", e);
        } finally {
            setLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    }, []);

    const handleReject = useCallback(async (userId: string) => {
        setLoadingIds((prev) => new Set(prev).add(userId));
        try {
            await rejectFollowRequest(userId);
            // Remove from list
            setFollowRequests((prev) => prev.filter((u) => u.id !== userId));
        } catch (e) {
            console.error("Failed to reject:", e);
        } finally {
            setLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-zinc-100">Bildirimler</h1>
                <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                    Tümünü okundu işaretle
                </button>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Follow Requests Section */}
                    {followRequests.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Takip İstekleri
                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                                    {followRequests.filter(r => !acceptedIds.has(r.id)).length}
                                </span>
                            </h2>
                            <div className="space-y-2">
                                {followRequests.map((user) => (
                                    <FollowRequestItem
                                        key={user.id}
                                        user={user}
                                        onAccept={() => handleAccept(user.id)}
                                        onReject={() => handleReject(user.id)}
                                        loading={loadingIds.has(user.id)}
                                        accepted={acceptedIds.has(user.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regular Notifications */}
                    {notifications.length === 0 && followRequests.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">Bildirim yok</div>
                    ) : notifications.length > 0 && (
                        <div>
                            {followRequests.length > 0 && (
                                <h2 className="text-lg font-semibold text-zinc-200 mb-3">Diğer Bildirimler</h2>
                            )}
                            <div className="space-y-2">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 rounded-xl border transition-colors cursor-pointer ${notif.isRead
                                            ? "border-white/5 bg-white/5 hover:bg-white/10"
                                            : "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full shrink-0"
                                                style={{
                                                    backgroundImage: notif.actor
                                                        ? `linear-gradient(135deg, ${notif.actor.avatarGradient[0]}, ${notif.actor.avatarGradient[1]})`
                                                        : "linear-gradient(135deg, #333, #666)",
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-zinc-100">
                                                    <span className="font-medium">{notif.actor?.displayName || "Birisi"}</span>{" "}
                                                    <span className="text-zinc-400">{notif.message}</span>
                                                </p>
                                                <p className="text-sm text-zinc-500 mt-1">{formatTime(notif.createdAt)}</p>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
