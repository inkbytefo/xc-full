// ============================================================================
// Followers/Following Modal Component
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserFollowers, getUserFollowing, followUser, unfollowUser, type UserProfile } from "./userApi";
import { useAuthStore } from "../../store/authStore";

type ModalTab = "followers" | "following";

interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    initialTab?: ModalTab;
    initialFollowersCount?: number;
    initialFollowingCount?: number;
}

export function FollowersModal({
    isOpen,
    onClose,
    userId,
    userName,
    initialTab = "followers",
    initialFollowersCount = 0,
    initialFollowingCount = 0,
}: FollowersModalProps) {
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);

    const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
    const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

    // Reset when modal opens or tab changes
    useEffect(() => {
        if (isOpen) {
            setUsers([]);
            setCursor(undefined);
            setHasMore(true);
            loadUsers();
        }
    }, [isOpen, activeTab, userId]);

    // Update initial tab when prop changes
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [initialTab, isOpen]);

    const loadUsers = useCallback(async (nextCursor?: string) => {
        if (loading || (!hasMore && nextCursor)) return;

        setLoading(true);
        try {
            const response = activeTab === "followers"
                ? await getUserFollowers(userId, { cursor: nextCursor, limit: 20 })
                : await getUserFollowing(userId, { cursor: nextCursor, limit: 20 });

            const newUsers = response.data;
            setUsers((prev) => nextCursor ? [...prev, ...newUsers] : newUsers);

            // Initialize following states
            const states: Record<string, boolean> = {};
            newUsers.forEach((u) => {
                states[u.id] = u.isFollowing || false;
            });
            setFollowingStates((prev) => ({ ...prev, ...states }));

            setCursor(response.nextCursor || undefined);
            setHasMore(!!response.nextCursor);
        } catch (err) {
            console.error("Failed to load users:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, userId, loading, hasMore]);

    const handleFollowToggle = async (targetUserId: string) => {
        if (followLoading[targetUserId] || targetUserId === currentUser?.id) return;

        setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }));

        try {
            const isCurrentlyFollowing = followingStates[targetUserId];
            if (isCurrentlyFollowing) {
                await unfollowUser(targetUserId);
                setFollowingStates((prev) => ({ ...prev, [targetUserId]: false }));
            } else {
                await followUser(targetUserId);
                setFollowingStates((prev) => ({ ...prev, [targetUserId]: true }));
            }
        } catch (err) {
            console.error("Follow action failed:", err);
        } finally {
            setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }));
        }
    };

    const handleUserClick = (userId: string) => {
        onClose();
        navigate(`/profile/${userId}`);
    };

    const handleLoadMore = () => {
        if (cursor && hasMore && !loading) {
            loadUsers(cursor);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{userName}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab("followers")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "followers"
                                ? "text-purple-400 border-b-2 border-purple-500"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        Takipçiler ({initialFollowersCount.toLocaleString()})
                    </button>
                    <button
                        onClick={() => setActiveTab("following")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "following"
                                ? "text-purple-400 border-b-2 border-purple-500"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        Takip ({initialFollowingCount.toLocaleString()})
                    </button>
                </div>

                {/* User List */}
                <div className="max-h-96 overflow-y-auto">
                    {loading && users.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <p className="font-medium">
                                {activeTab === "followers" ? "Henüz takipçi yok" : "Henüz takip edilen yok"}
                            </p>
                        </div>
                    ) : (
                        <>
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                                >
                                    <button
                                        onClick={() => handleUserClick(user.id)}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full shrink-0"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
                                            }}
                                        />
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-white truncate">{user.displayName}</span>
                                                {user.isVerified && <span className="text-purple-400 text-sm">✓</span>}
                                            </div>
                                            <div className="text-sm text-zinc-500 truncate">@{user.handle}</div>
                                        </div>
                                    </button>

                                    {user.id !== currentUser?.id && (
                                        <button
                                            onClick={() => handleFollowToggle(user.id)}
                                            disabled={followLoading[user.id]}
                                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${followingStates[user.id]
                                                    ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
                                                    : "bg-purple-600 text-white hover:bg-purple-700"
                                                }`}
                                        >
                                            {followLoading[user.id] ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            ) : followingStates[user.id] ? (
                                                "Takip Ediliyor"
                                            ) : (
                                                "Takip Et"
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Load more */}
                            {hasMore && (
                                <div className="p-4 text-center">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loading}
                                        className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Yükleniyor..." : "Daha Fazla Yükle"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
