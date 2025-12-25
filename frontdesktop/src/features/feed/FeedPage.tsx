// ============================================================================
// FeedPage - Home Feed (React Query Version)
// ============================================================================
// Refactored to use React Query hooks for caching and optimistic updates.

import { useEffect, useRef, useState } from "react";
import type { Server } from "../../api/types";
import { PostCard, PostComposer, GlobalSearchModal } from "./components";
import { useFeed, useCreatePost, useFeedActions, flattenFeedPages } from "./hooks";
import { type TimelineFilter } from "./feedApi";
import { fetchServers } from "../servers/serversApi";

export function FeedPage() {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [showSearch, setShowSearch] = useState(false);
  const [userServers, setUserServers] = useState<Server[]>([]);
  const [uiError, setUiError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // React Query: Feed data
  const {
    data: feedData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: feedError,
  } = useFeed(filter);

  // React Query: Create post mutation
  const createPostMutation = useCreatePost(filter);

  // React Query: Actions (like/repost/bookmark)
  const actions = useFeedActions(filter);

  // Flatten posts from pages
  const posts = flattenFeedPages(feedData);

  // Fetch user's servers for visibility selection
  useEffect(() => {
    fetchServers()
      .then(setUserServers)
      .catch(() => setUserServers([]));
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage && hasNextPage) {
          fetchNextPage();
        }
      },
      { root: null, rootMargin: "600px 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Filter tabs
  const filterTabs = [
    { key: "all" as const, label: "Sana özel" },
    { key: "friends" as const, label: "Takip edilenler" },
    { key: "servers" as const, label: "Sunucular" },
  ];

  // Create post handler
  async function handleCreate(payload: { text: string; visibility: string }) {
    setUiError(null);
    try {
      await createPostMutation.mutateAsync({
        content: payload.text,
        visibility: payload.visibility as "public" | "friends" | "server",
      });
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Paylaşım başarısız.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-[#050505]/80 px-4 backdrop-blur-xl">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-xl font-bold text-zinc-100">Ana Sayfa</h1>
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10"
            title="Ara (Ctrl+K)"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-zinc-300">
              <path d="M10.5 3a7.5 7.5 0 1 0 4.7 13.4l4.7 4.7 1.4-1.4-4.7-4.7A7.5 7.5 0 0 0 10.5 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`relative flex-1 py-4 text-center text-sm font-medium transition-colors ${filter === t.key ? "text-zinc-100" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                }`}
            >
              {t.label}
              {filter === t.key && <div className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-blue-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {(uiError || feedError) && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {uiError || (feedError instanceof Error ? feedError.message : "Bir hata oluştu")}
        </div>
      )}

      {/* Composer */}
      <div className="mt-4">
        <PostComposer servers={userServers} onSubmit={handleCreate} busy={createPostMutation.isPending} />
      </div>

      {/* Feed */}
      <div className="mt-4 space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            busyAction={actions.getBusyAction(post.id)}
            onLike={() => actions.like(post.id)}
            onRepost={() => actions.repost(post.id)}
            onBookmark={() => actions.bookmark(post.id)}
          />
        ))}

        {/* Loading */}
        {(isLoading || isFetchingNextPage) && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && posts.length === 0 && (
          <div className="py-8 text-center text-zinc-500">
            Henüz gönderi yok. İlk gönderiyi sen paylaş!
          </div>
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8" />

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
