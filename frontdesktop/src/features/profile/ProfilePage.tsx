import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { EditProfileModal } from "./EditProfileModal";
import { FollowersModal } from "./FollowersModal";
import { useUserProfile, useUserPosts, useProfileActions } from "./hooks";
import type { Post } from "../../api/types";

type ProfileTab = "posts" | "likes" | "media";

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

  // Use profile hooks
  const { profile, isLoading, error, isOwnProfile, currentUser } = useUserProfile({ userId });

  // Use posts hook
  const { data: posts = [], isLoading: postsLoading } = useUserPosts({
    userId: isOwnProfile ? currentUser?.id : profile?.id,
    enabled: !!profile || isOwnProfile,
  });

  // Use profile actions
  const {
    isFollowing,
    setIsFollowing,
    followLoading,
    handleToggleFollow,
    dmLoading,
    handleDM,
  } = useProfileActions({
    userId: profile?.id,
    initialIsFollowing: profile?.isFollowing ?? false,
  });

  // Sync isFollowing when profile loads
  useEffect(() => {
    if (profile?.isFollowing !== undefined) {
      setIsFollowing(profile.isFollowing);
    }
  }, [profile?.isFollowing, setIsFollowing]);

  const openFollowersModal = (tab: "followers" | "following") => {
    setFollowersModalTab(tab);
    setIsFollowersModalOpen(true);
  };

  // Check auth if we are viewing own profile but currentUser is missing despite being authenticated
  useEffect(() => {
    const { isAuthenticated, user } = useAuthStore.getState();

    if (isOwnProfile && !user && isAuthenticated) {
      console.log("Detecting inconsistent auth state, re-verifying session...");
      checkAuth();
    }
  }, [isOwnProfile, currentUser, checkAuth]);

  if (isLoading) {
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
        <p className="text-lg">Kullanıcı bulunamadı</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
        >
          Sayfayı Yenile
        </button>
      </div>
    );
  }

  if (!profile) {
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
            backgroundImage: `linear-gradient(135deg, ${profile.avatarGradient[0]}80, ${profile.avatarGradient[1]}80)`,
          }}
        />

        <div className="absolute -bottom-16 left-6">
          <div
            className="w-32 h-32 rounded-full ring-4 ring-[#050505] shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${profile.avatarGradient[0]}, ${profile.avatarGradient[1]})`,
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
                onClick={handleToggleFollow}
                disabled={followLoading}
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
          <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>
          {profile.isVerified && (
            <span className="text-purple-400 text-xl">✓</span>
          )}
        </div>
        <p className="text-zinc-500 mt-0.5">@{profile.handle}</p>

        {profile.bio && (
          <p className="mt-4 text-zinc-200">{profile.bio}</p>
        )}

        <div className="flex gap-6 mt-4">
          <button className="group" onClick={() => openFollowersModal("followers")}>
            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
              {profile.followersCount?.toLocaleString() || 0}
            </span>{" "}
            <span className="text-zinc-500">takipçi</span>
          </button>
          <button className="group" onClick={() => openFollowersModal("following")}>
            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
              {profile.followingCount?.toLocaleString() || 0}
            </span>{" "}
            <span className="text-zinc-500">takip</span>
          </button>
          <div>
            <span className="font-bold text-white">{profile.postsCount?.toLocaleString() || 0}</span>{" "}
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
              posts.map((post: Post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-xl bg-[#050505]/60 backdrop-blur-md border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${profile.avatarGradient[0]}, ${profile.avatarGradient[1]})`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{profile.displayName}</span>
                        <span className="text-zinc-500 text-sm">@{profile.handle}</span>
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
          // Profile will auto-refresh via React Query
        }}
      />

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={profile.id}
        userName={profile.displayName}
        initialTab={followersModalTab}
        initialFollowersCount={profile.followersCount || 0}
        initialFollowingCount={profile.followingCount || 0}
      />
    </div>
  );
}
