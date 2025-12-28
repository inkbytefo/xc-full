import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { EditProfileModal } from "./EditProfileModal";
import { FollowersModal } from "./FollowersModal";
import { useUserProfile, useUserPosts, useProfileActions } from "./hooks";
import type { Post } from "../../api/types";

type ProfileTab = "posts" | "likes" | "media";

export function ProfilePage() {
  const { userId, handle } = useParams<{ userId?: string; handle?: string }>();
  const navigate = useNavigate();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

  // Use profile hooks
  const { profile, isLoading, error, isOwnProfile, currentUser } = useUserProfile({ userId, handle });

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
      checkAuth();
    }
  }, [isOwnProfile, checkAuth]);

  const coverStyle = useMemo(() => {
    if (profile?.bannerUrl) {
      return {
        backgroundImage: `linear-gradient(135deg, ${profile.avatarGradient[0]}40, ${profile.avatarGradient[1]}40), url(${profile.bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } as const;
    }

    if (profile) {
      return {
        backgroundImage: `linear-gradient(135deg, ${profile.avatarGradient[0]}80, ${profile.avatarGradient[1]}80)`,
      } as const;
    }

    return {
      backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
    } as const;
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
          <p className="text-zinc-500 text-sm">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg text-zinc-200 font-semibold mb-1">Kullanıcı bulunamadı</p>
          <p className="text-sm text-zinc-500 mb-4">Profil yüklenemedi veya erişiminiz yok.</p>
        <button
            onClick={() => navigate("/feed")}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm text-zinc-200"
        >
            Ana Sayfaya Dön
        </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-lg text-zinc-200 font-semibold mb-1">Profil yüklenemedi</p>
          <button
            onClick={() => navigate("/feed")}
            className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm text-zinc-200"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="max-w-3xl mx-auto pb-10">
      {/* Cover & Avatar */}
      <div className="relative">
        <div
          className="h-52 rounded-b-3xl border-b border-white/5"
          style={coverStyle}
        />

        <div className="absolute -bottom-16 left-6">
          {profile.avatarUrl ? (
            <div className="w-32 h-32 rounded-full ring-4 ring-[#0a0a0f] shadow-2xl overflow-hidden bg-white/5">
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="w-32 h-32 rounded-full ring-4 ring-[#0a0a0f] shadow-2xl"
              style={{
                backgroundImage: `linear-gradient(135deg, ${profile.avatarGradient[0]}, ${profile.avatarGradient[1]})`,
              }}
            />
          )}
        </div>

        <div className="absolute bottom-4 right-4">
          {isOwnProfile ? (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-5 py-2 rounded-full bg-[#0a0a0f]/60 backdrop-blur-md border border-white/20 text-zinc-100 font-medium hover:bg-[#0a0a0f]/80 transition-colors"
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
                className="px-5 py-2 rounded-full bg-[#0a0a0f]/60 backdrop-blur-md border border-white/20 text-zinc-100 font-medium hover:bg-[#0a0a0f]/80 transition-colors disabled:opacity-50"
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
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/15 border border-purple-500/30">
              <svg className="w-3.5 h-3.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-zinc-500 mt-0.5">@{profile.handle}</p>

        {profile.bio && (
          <p className="mt-4 text-zinc-200">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-6 mt-4">
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
                  <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
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
                  className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
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
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{post.likeCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-purple-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 8l-4-4H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span>{post.replyCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-green-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7l1 1M19 5a9 9 0 00-14 7l-1 1" />
                          </svg>
                        </button>
                        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-yellow-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3-7 3V5z" />
                          </svg>
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
              <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
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
              <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h3l2-3h8l2 3h3v13a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
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
    </div>
  );
}
