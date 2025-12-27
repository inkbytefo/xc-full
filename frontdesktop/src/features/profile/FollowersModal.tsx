// ============================================================================
// Followers/Following Modal Component - Refactored with React Query
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFollowers, useFollowing, useToggleFollow } from "../../lib/query";
import { useAuthStore } from "../../store/authStore";
import type { UserProfile } from "./userApi";

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

    // React Query hooks for fetching followers/following
    const {
        data: followersData,
        isLoading: followersLoading,
        hasNextPage: hasMoreFollowers,
        fetchNextPage: fetchMoreFollowers,
        isFetchingNextPage: isFetchingMoreFollowers,
    } = useFollowers(activeTab === "followers" && isOpen ? userId : null);

    const {
        data: followingData,
        isLoading: followingLoading,
        hasNextPage: hasMoreFollowing,
        fetchNextPage: fetchMoreFollowing,
        isFetchingNextPage: isFetchingMoreFollowing,
    } = useFollowing(activeTab === "following" && isOpen ? userId : null);

    // Flatten paginated data
    const users: UserProfile[] = useMemo(() => {
        if (activeTab === "followers") {
            return followersData?.pages.flatMap(page => page.data) ?? [];
        }
        return followingData?.pages.flatMap(page => page.data) ?? [];
    }, [activeTab, followersData, followingData]);

    // Loading states
    const loading = activeTab === "followers" ? followersLoading : followingLoading;
    const hasMore = activeTab === "followers" ? hasMoreFollowers : hasMoreFollowing;
    const isFetchingMore = activeTab === "followers" ? isFetchingMoreFollowers : isFetchingMoreFollowing;

    // Toggle follow hook
    const { toggle } = useToggleFollow();

    // Track individual follow states (local)
    const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
    const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

    // Initialize following states from server data
    useEffect(() => {
        const states: Record<string, boolean> = {};
        users.forEach((u) => {
            states[u.id] = u.isFollowing || false;
        });
        setFollowingStates((prev) => ({ ...prev, ...states }));
    }, [users]);

    // Update initial tab when prop changes
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [initialTab, isOpen]);

    const handleFollowToggle = async (targetUserId: string) => {
        if (followLoading[targetUserId] || targetUserId === currentUser?.id) return;

        setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }));

        try {
            const isCurrentlyFollowing = followingStates[targetUserId];
            await toggle(targetUserId, isCurrentlyFollowing);
            setFollowingStates((prev) => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));
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
        if (activeTab === "followers" && hasMoreFollowers && !isFetchingMoreFollowers) {
            fetchMoreFollowers();
        } else if (activeTab === "following" && hasMoreFollowing && !isFetchingMoreFollowing) {
            fetchMoreFollowing();
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
                                        disabled={isFetchingMore}
                                        className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
                                    >
                                        {isFetchingMore ? "Yükleniyor..." : "Daha Fazla Yükle"}
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
