// ============================================================================
// FeedPage - Twitter/X Style Three Column Layout
// ============================================================================
// Layout: Left Nav (docked left) | Center Feed (centered) | Right Sidebar (docked right)

import { useEffect, useRef, useState } from "react";
import type { Server } from "../../api/types";
import {
  PostCard,
  PostComposer,
  GlobalSearchModal,
  FeedHeader,
  FeedEmptyState,
  FeedNavSidebar,
  FeedRightSidebar,
} from "./components";
import { useFeed, useCreatePost, useFeedActions, flattenFeedPages } from "./hooks";
import { type TimelineFilter } from "./feedApi";
import { useServers } from "../../lib/query";

export function FeedPage() {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [showSearch, setShowSearch] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // React Query: User's servers for post visibility selection
  const { data: userServers = [] } = useServers();

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
    <div className="h-full w-full flex">
      {/* Left Sidebar - Docked to left (after main sidebar) */}
      <aside className="w-48 shrink-0 h-full overflow-y-auto scrollbar-none border-r border-white/5">
        <FeedNavSidebar activeFilter={filter} onFilterChange={setFilter} />
      </aside>

      {/* Center - Main Feed (centered, flexible) */}
      <main className="flex-1 h-full overflow-y-auto scrollbar-none flex justify-center">
        <div className="w-full max-w-xl">
          {/* Header */}
          <FeedHeader onSearchClick={() => setShowSearch(true)} />

          {/* Content Area */}
          <div className="px-4 py-4">
            {/* Error */}
            {(uiError || feedError) && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {uiError || (feedError instanceof Error ? feedError.message : "Bir hata oluştu")}
              </div>
            )}

            {/* Composer */}
            <PostComposer
              servers={userServers as Server[]}
              onSubmit={handleCreate}
              busy={createPostMutation.isPending}
            />

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

              {/* Empty State */}
              {!isLoading && posts.length === 0 && <FeedEmptyState filter={filter} />}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-8" />
          </div>
        </div>
      </main>

      {/* Right Sidebar - Docked to right, hidden scrollbar */}
      <aside className="w-72 shrink-0 h-full overflow-y-auto scrollbar-none border-l border-white/5">
        <FeedRightSidebar />
      </aside>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
