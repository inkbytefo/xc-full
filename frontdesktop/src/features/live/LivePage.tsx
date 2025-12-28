import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LiveCategoriesGrid,
  LiveEmptyState,
  LiveErrorBanner,
  LiveLoadingSpinner,
  LiveStreamDetail,
  LiveStreamsGrid,
  LiveTabs,
} from "./components";
import { useCategoryStreams, useLiveCategories, useLiveStream, useLiveStreams } from "./hooks";

export function LivePage() {
  const { streamId } = useParams<{ streamId?: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"browse" | "categories">("browse");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const streamsQuery = useLiveStreams({ limit: 40 });
  const categoriesQuery = useLiveCategories();
  const streamQuery = useLiveStream(streamId ?? null);
  const categoryStreamsQuery = useCategoryStreams(selectedCategoryId, { limit: 40 });

  const errorMessage = useMemo(() => {
    const err = streamQuery.error ?? categoryStreamsQuery.error ?? streamsQuery.error ?? categoriesQuery.error;
    if (!err) return null;
    return err instanceof Error ? err.message : "Bir hata oluştu";
  }, [categoryStreamsQuery.error, categoriesQuery.error, streamQuery.error, streamsQuery.error]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const categories = categoriesQuery.data ?? [];
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? null;
  }, [categoriesQuery.data, selectedCategoryId]);

  if (streamId) {
    return (
      <div className="h-full w-full overflow-y-auto scrollbar-none bg-transparent">
        {streamQuery.isLoading ? (
          <LiveLoadingSpinner />
        ) : streamQuery.data ? (
          <LiveStreamDetail stream={streamQuery.data} onBack={() => navigate("/live")} />
        ) : (
          <div className="w-full max-w-5xl mx-auto px-4 py-6">
            {errorMessage ? <LiveErrorBanner message={errorMessage} /> : null}
            <LiveEmptyState icon="📺" title="Yayın bulunamadı" subtitle="Bu yayın artık mevcut olmayabilir." />
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate("/live")}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                ← Yayınlara Dön
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto scrollbar-none bg-transparent">
      <div className="w-full max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Canlı Yayınlar</h1>
          <p className="text-zinc-400">En popüler yayınları keşfet</p>
        </div>

        <LiveTabs activeTab={activeTab} onChange={setActiveTab} />

        {errorMessage ? <LiveErrorBanner message={errorMessage} /> : null}

        {streamsQuery.isLoading || categoriesQuery.isLoading ? (
          <LiveLoadingSpinner />
        ) : activeTab === "browse" ? (
          <>
            {selectedCategoryId ? (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-200">
                  {selectedCategoryName ?? "Kategori"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Filtreyi temizle
                </button>
              </div>
            ) : null}

            {(() => {
              const base = selectedCategoryId ? (categoryStreamsQuery.data?.data ?? []) : (streamsQuery.data?.data ?? []);
              const liveStreams = base.filter((s) => s.status === "live");

              if (!selectedCategoryId && liveStreams.length === 0) {
                return <LiveEmptyState icon="📺" title="Şu anda canlı yayın yok" subtitle="Daha sonra tekrar kontrol edin" />;
              }

              if (selectedCategoryId && !categoryStreamsQuery.isLoading && liveStreams.length === 0) {
                return <LiveEmptyState icon="📺" title="Bu kategoride canlı yayın yok" subtitle="Başka bir kategori deneyin" />;
              }

              if (selectedCategoryId && categoryStreamsQuery.isLoading) {
                return <LiveLoadingSpinner />;
              }

              return <LiveStreamsGrid streams={liveStreams} onOpenStream={(id) => navigate(`/live/${id}`)} />;
            })()}
          </>
        ) : (
          <>
            {categoriesQuery.data && categoriesQuery.data.length === 0 ? (
              <LiveEmptyState icon="📁" title="Henüz kategori yok" />
            ) : (
              <LiveCategoriesGrid
                categories={categoriesQuery.data ?? []}
                onSelectCategory={(id) => {
                  setSelectedCategoryId(id);
                  setActiveTab("browse");
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
