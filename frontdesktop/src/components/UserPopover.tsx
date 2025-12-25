import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { followUser, unfollowUser, getUser, type UserProfile } from "../features/profile/userApi";

interface UserPopoverProps {
    userId: string;
    children: ReactNode;
    // User data (can be passed directly or fetched)
    user?: {
        id: string;
        handle: string;
        displayName: string;
        avatarGradient: [string, string];
        bio?: string;
        isVerified?: boolean;
        followersCount?: number;
        followingCount?: number;
        isFollowing?: boolean;
    };
}

export function UserPopover({ userId, children, user }: UserPopoverProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<"top" | "bottom">("bottom");
    const [isFollowing, setIsFollowing] = useState(user?.isFollowing || false);
    const [followLoading, setFollowLoading] = useState(false);
    const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    // Update isFollowing when user prop changes
    useEffect(() => {
        setIsFollowing(user?.isFollowing || false);
    }, [user?.isFollowing]);

    // Calculate position on open
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setPosition(spaceBelow < 300 ? "top" : "bottom");
        }
    }, [isOpen]);

    // Fetch user data from API if not provided
    useEffect(() => {
        if (isOpen && !user && !fetchedUser && !userLoading) {
            setUserLoading(true);
            getUser(userId)
                .then((userData) => {
                    setFetchedUser(userData);
                    setIsFollowing(userData.isFollowing || false);
                })
                .catch((err) => console.error("Failed to load user:", err))
                .finally(() => setUserLoading(false));
        }
    }, [isOpen, userId, user, fetchedUser, userLoading]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        timeoutRef.current = window.setTimeout(() => {
            setIsOpen(true);
        }, 300); // 300ms delay before showing
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        timeoutRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 150); // 150ms delay before hiding
    };

    const handleProfileClick = () => {
        setIsOpen(false);
        navigate(`/profile/${userId}`);
    };

    const handleFollowClick = async () => {
        if (followLoading) return;

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(userId);
                setIsFollowing(false);
            } else {
                await followUser(userId);
                setIsFollowing(true);
            }
        } catch (err) {
            console.error("Follow action failed:", err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleDMClick = () => {
        navigate(`/dms`);
    };

    // Use provided user, fetched user, or loading placeholder
    const displayUser = user || fetchedUser || {
        id: userId,
        handle: "loading",
        displayName: "Yükleniyor...",
        avatarGradient: ["#8B5CF6", "#EC4899"] as [string, string],
        bio: "",
        isVerified: false,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false,
    };

    return (
        <div
            ref={triggerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={`absolute z-50 ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"
                        } left-0`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="w-72 bg-[#0f0f15]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {userLoading ? (
                            <div className="p-8 flex justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                            </div>
                        ) : (
                            <>
                                {/* Cover */}
                                <div
                                    className="h-16 bg-gradient-to-r from-purple-600/60 to-pink-600/60"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${displayUser.avatarGradient[0]}40, ${displayUser.avatarGradient[1]}40)`,
                                    }}
                                />

                                {/* Avatar & Info */}
                                <div className="px-4 pb-4">
                                    <div className="flex items-end justify-between -mt-8">
                                        <div
                                            className="w-16 h-16 rounded-full ring-4 ring-[#0f0f15]"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, ${displayUser.avatarGradient[0]}, ${displayUser.avatarGradient[1]})`,
                                            }}
                                        />
                                        <button
                                            onClick={handleFollowClick}
                                            disabled={followLoading}
                                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${isFollowing
                                                ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
                                                : "bg-purple-600 text-white hover:bg-purple-700"
                                                }`}
                                        >
                                            {isFollowing ? "Takip Ediliyor" : "Takip Et"}
                                        </button>
                                    </div>

                                    {/* Name & Handle */}
                                    <div className="mt-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-white">{displayUser.displayName}</span>
                                            {displayUser.isVerified && (
                                                <span className="text-purple-400 text-sm">✓</span>
                                            )}
                                        </div>
                                        <p className="text-zinc-500 text-sm">@{displayUser.handle}</p>
                                    </div>

                                    {/* Bio */}
                                    {displayUser.bio && (
                                        <p className="mt-2 text-zinc-300 text-sm line-clamp-2">{displayUser.bio}</p>
                                    )}

                                    {/* Stats */}
                                    <div className="flex gap-4 mt-3 text-sm">
                                        <span>
                                            <span className="font-semibold text-white">{displayUser.followersCount?.toLocaleString() || 0}</span>{" "}
                                            <span className="text-zinc-500">takipçi</span>
                                        </span>
                                        <span>
                                            <span className="font-semibold text-white">{displayUser.followingCount?.toLocaleString() || 0}</span>{" "}
                                            <span className="text-zinc-500">takip</span>
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={handleProfileClick}
                                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                                        >
                                            Profile Git
                                        </button>
                                        <button
                                            onClick={handleDMClick}
                                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-colors"
                                        >
                                            Mesaj Gönder
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
