import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LiveErrorBanner,
  LiveLoadingSpinner,
  LiveStreamDetail,
  LiveStreamsGrid,
} from "./components";
import { LiveHero } from "./components/LiveHero";
import { LiveCategoryRail } from "./components/LiveCategoryRail";
import { useCategoryStreams, useLiveCategories, useLiveStream, useLiveStreams } from "./hooks";

export function LivePage() {
  const { streamId } = useParams<{ streamId?: string }>();
  const navigate = useNavigate();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const streamsQuery = useLiveStreams({ limit: 40 });
  const categoriesQuery = useLiveCategories();
  const streamQuery = useLiveStream(streamId ?? null);
  const categoryStreamsQuery = useCategoryStreams(selectedCategoryId, { limit: 40 });

  const errorMessage = useMemo(() => {
    const err = streamQuery.error ?? categoryStreamsQuery.error ?? streamsQuery.error ?? categoriesQuery.error;
    if (!err) return null;
    return err instanceof Error ? err.message : "An error occurred";
  }, [categoryStreamsQuery.error, categoriesQuery.error, streamQuery.error, streamsQuery.error]);

  // Featured Stream Logic: Just pick the first live stream for now
  const featuredStream = useMemo(() => {
    const all = streamsQuery.data?.data ?? [];
    return all.length > 0 ? all[0] : undefined;
  }, [streamsQuery.data]);

  // Filter logic
  const displayStreams = useMemo(() => {
    const base = selectedCategoryId ? (categoryStreamsQuery.data?.data ?? []) : (streamsQuery.data?.data ?? []);
    // Exclude featured stream from grid if it's the only one? No, just show all in grid too like Twitch.
    // Or filter out duplicates if we want.
    // Let's filter out the featured one from the grid if we are on "All Channels" view
    if (!selectedCategoryId && featuredStream) {
      return base.filter(s => s.id !== featuredStream.id);
    }
    return base;
  }, [selectedCategoryId, categoryStreamsQuery.data, streamsQuery.data, featuredStream]);


  // Detail View (Player)
  if (streamId) {
    return (
      <div className="h-full w-full overflow-hidden bg-black">
        {streamQuery.isLoading ? (
          <LiveLoadingSpinner />
        ) : streamQuery.data ? (
          <LiveStreamDetail stream={streamQuery.data} onBack={() => navigate("/live")} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4">
            <div className="text-6xl">📺</div>
            <h2 className="text-xl font-bold text-white">Stream Unavailable</h2>
            <p>This stream may have ended or does not exist.</p>
            <button onClick={() => navigate("/live")} className="text-purple-400 hover:text-purple-300">Back to Live</button>
          </div>
        )}
      </div>
    );
  }

  // Browse View
  return (
    <div className="h-full w-full overflow-y-auto bg-transparent scrollbar-thin scrollbar-thumb-white/10">
      <div className="w-full max-w-[1800px] mx-auto p-6 md:p-8 space-y-10">

        {/* Error Banner */}
        {errorMessage && <LiveErrorBanner message={errorMessage} />}

        {/* Hero Section (Only show on "All" view) */}
        {!selectedCategoryId && streamsQuery.data?.data && streamsQuery.data.data.length > 0 && (
          <section className="animate-fade-in-down">
            <LiveHero stream={featuredStream} />
          </section>
        )}

        {/* Categories Rail */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">#</span> Explore Categories
            </h2>
          </div>
          {categoriesQuery.isLoading ? (
            <div className="h-12 w-full bg-white/5 animate-pulse rounded-xl" />
          ) : (
            <LiveCategoryRail
              categories={categoriesQuery.data ?? []}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
        </section>

        {/* Live Channels Grid */}
        <section className="pb-20 space-y-4 min-h-[400px]">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">
              {selectedCategoryId ? "Category Channels" : "Live Channels We Think You’ll Like"}
            </h2>
            {!selectedCategoryId && <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 text-xs font-bold">RECOMMENDED</span>}
          </div>

          {streamsQuery.isLoading ? (
            <LiveLoadingSpinner />
          ) : displayStreams.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border border-dashed border-white/10 rounded-3xl">
              <div className="text-4xl mb-4 opacity-50">📡</div>
              <p>No active streams found in this section.</p>
            </div>
          ) : (
            <LiveStreamsGrid streams={displayStreams} onOpenStream={(id) => navigate(`/live/${id}`)} />
          )}
        </section>

      </div>
    </div>
  );
}
