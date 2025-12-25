import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { EditProfileModal } from "./EditProfileModal";
import { FollowersModal } from "./FollowersModal";
import { getUser, followUser, unfollowUser, type UserProfile } from "./userApi";
import { startConversation } from "../dm/dmApi";
import { getUserPosts } from "../feed/feedApi";
import type { Post } from "../../api/types";

type ProfileTab = "posts" | "likes" | "media";

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [dmLoading, setDmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Determine if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?.id;

  // Load profile data from API
  useEffect(() => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    getUser(targetUserId)
      .then((user) => {
        setProfileUser(user);
        setIsFollowing(user.isFollowing || false);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setError("Kullanıcı bulunamadı");
        setProfileUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, currentUser?.id]);

  // Load user posts from API
  useEffect(() => {
    const targetUserId = isOwnProfile ? currentUser?.id : profileUser?.id;
    if (!targetUserId) return;

    setPostsLoading(true);
    getUserPosts(targetUserId)
      .then((res) => setPosts(res.data))
      .catch((err) => console.error("Failed to load posts:", err))
      .finally(() => setPostsLoading(false));
  }, [isOwnProfile, currentUser?.id, profileUser?.id]);

  // Display user (prioritize fetched profileUser for counts)
  const displayUser = profileUser || (isOwnProfile && currentUser ? {
    id: currentUser.id,
    handle: currentUser.handle,
    displayName: currentUser.displayName,
    avatarGradient: (currentUser.avatarGradient || ["#8B5CF6", "#EC4899"]) as [string, string],
    bio: currentUser.bio || "",
    isVerified: currentUser.isVerified || false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  } : null);

  const handleFollowClick = async () => {
    if (!profileUser || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profileUser.id);
        setIsFollowing(false);
        // Update local follower count
        setProfileUser(prev => prev ? { ...prev, followersCount: (prev.followersCount || 1) - 1 } : null);
      } else {
        await followUser(profileUser.id);
        setIsFollowing(true);
        setProfileUser(prev => prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : null);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDM = async () => {
    if (!profileUser || dmLoading) return;

    setDmLoading(true);
    try {
      const conv = await startConversation(profileUser.id);
      navigate(`/dms/${conv.id}`);
    } catch (err) {
      console.error("Failed to start conversation:", err);
    } finally {
      setDmLoading(false);
    }
  };

  const openFollowersModal = (tab: "followers" | "following") => {
    setFollowersModalTab(tab);
    setIsFollowersModalOpen(true);
  };

  // Check auth if we are viewing own profile but currentUser is missing or error occurred
  // Check auth if we are viewing own profile but currentUser is missing despite being authenticated
  useEffect(() => {
    // Only check if we expect to be logged in but have no user data
    // Do NOT include 'error' in this check to prevent infinite loops on 404s
    const { isAuthenticated, user, checkAuth } = useAuthStore.getState();

    if (isOwnProfile && !user && isAuthenticated) {
      console.log("Detecting inconsistent auth state, re-verifying session...");
      checkAuth();
      // No reload needed - if checkAuth succeeds, 'user' will update and trigger the data fetch effect above
    }
  }, [isOwnProfile, currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500">
        <div className="text-6xl mb-4">😔</div>
        <p className="text-lg">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
        >
          Sayfayı Yenile
        </button>
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500">
        <div className="text-6xl mb-4">👤</div>
        <p className="text-lg">Kullanıcı profili yüklenemedi</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Cover & Avatar */}
      <div className="relative">
        <div
          className="h-48 rounded-b-3xl"
          style={{
            backgroundImage: `linear-gradient(135deg, ${displayUser.avatarGradient[0]}80, ${displayUser.avatarGradient[1]}80)`,
          }}
        />

        <div className="absolute -bottom-16 left-6">
          <div
            className="w-32 h-32 rounded-full ring-4 ring-[#050505] shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${displayUser.avatarGradient[0]}, ${displayUser.avatarGradient[1]})`,
            }}
          />
        </div>

        <div className="absolute bottom-4 right-4">
          {isOwnProfile ? (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-5 py-2 rounded-full bg-[#050505]/60 backdrop-blur-md border border-white/20 text-zinc-100 font-medium hover:bg-[#050505]/80 transition-colors"
            >
              Profili Düzenle
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleFollowClick}
                className={`px-5 py-2 rounded-full font-medium transition-colors ${isFollowing
                  ? "bg-white/10 backdrop-blur-md text-white hover:bg-red-500/20 hover:text-red-400"
                  : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
              >
                {isFollowing ? "Takip Ediliyor" : "Takip Et"}
              </button>
              <button
                onClick={handleDM}
                disabled={dmLoading}
                className="px-5 py-2 rounded-full bg-[#050505]/60 backdrop-blur-md border border-white/20 text-zinc-100 font-medium hover:bg-[#050505]/80 transition-colors disabled:opacity-50"
              >
                {dmLoading ? "..." : "Mesaj"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{displayUser.displayName}</h1>
          {displayUser.isVerified && (
            <span className="text-purple-400 text-xl">✓</span>
          )}
        </div>
        <p className="text-zinc-500 mt-0.5">@{displayUser.handle}</p>

        {displayUser.bio && (
          <p className="mt-4 text-zinc-200">{displayUser.bio}</p>
        )}

        <div className="flex gap-6 mt-4">
          <button className="group" onClick={() => openFollowersModal("followers")}>
            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
              {displayUser.followersCount?.toLocaleString() || 0}
            </span>{" "}
            <span className="text-zinc-500">takipçi</span>
          </button>
          <button className="group" onClick={() => openFollowersModal("following")}>
            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
              {displayUser.followingCount?.toLocaleString() || 0}
            </span>{" "}
            <span className="text-zinc-500">takip</span>
          </button>
          <div>
            <span className="font-bold text-white">{displayUser.postsCount?.toLocaleString() || 0}</span>{" "}
            <span className="text-zinc-500">gönderi</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-6 px-2">
        {(["posts", "likes", "media"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-center font-medium transition-all relative ${activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {tab === "posts" ? "Gönderiler" : tab === "likes" ? "Beğeniler" : "Medya"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === "posts" && (
          <div className="space-y-3">
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <span className="text-3xl">📝</span>
                </div>
                <p className="font-medium">Henüz gönderi yok</p>
                <p className="text-sm mt-1 text-zinc-600">
                  {isOwnProfile ? "İlk gönderini paylaş!" : "Henüz gönderi paylaşılmamış"}
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-xl bg-[#050505]/60 backdrop-blur-md border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${displayUser.avatarGradient[0]}, ${displayUser.avatarGradient[1]})`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{displayUser.displayName}</span>
                        <span className="text-zinc-500 text-sm">@{displayUser.handle}</span>
                        <span className="text-zinc-600 text-sm">·</span>
                        <span className="text-zinc-500 text-sm">
                          {new Date(post.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-zinc-200 mt-1">{post.content}</p>
                      <div className="flex gap-6 mt-3 text-sm">
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-pink-400 transition-colors">
                          <span>❤️</span>
                          <span>{post.likeCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-purple-400 transition-colors">
                          <span>💬</span>
                          <span>{post.replyCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-green-400 transition-colors">
                          <span>🔁</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-yellow-400 transition-colors">
                          <span>🔖</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "likes" && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span className="text-3xl">❤️</span>
            </div>
            <p className="font-medium">Henüz beğeni yok</p>
            <p className="text-sm mt-1 text-zinc-600">
              {isOwnProfile ? "Beğendiğin gönderiler burada görünecek" : "Beğeniler burada görünecek"}
            </p>
          </div>
        )}

        {activeTab === "media" && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span className="text-3xl">📷</span>
            </div>
            <p className="font-medium">Henüz medya yok</p>
            <p className="text-sm mt-1 text-zinc-600">
              {isOwnProfile ? "Paylaştığın görseller burada görünecek" : "Medya içerikleri burada görünecek"}
            </p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => {
          // Refresh profile or show success message
        }}
      />

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={displayUser.id}
        userName={displayUser.displayName}
        initialTab={followersModalTab}
        initialFollowersCount={displayUser.followersCount || 0}
        initialFollowingCount={displayUser.followingCount || 0}
      />
    </div>
  );
}
