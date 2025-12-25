import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Stream, Category } from "../../api/types";
import { fetchStreams, fetchCategories, getStream } from "./liveApi";

export function LivePage() {
  const { streamId } = useParams<{ streamId?: string }>();

  const [streams, setStreams] = useState<Stream[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browse" | "categories">("browse");

  // Load streams and categories on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const [streamsRes, cats] = await Promise.all([
          fetchStreams(),
          fetchCategories(),
        ]);
        if (!cancelled) {
          setStreams(streamsRes.data);
          setCategories(cats);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Yayınlar yüklenemedi");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load stream details if URL has streamId
  useEffect(() => {
    if (!streamId) {
      setSelectedStream(null);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const stream = await getStream(streamId!);
        if (!cancelled) {
          setSelectedStream(stream);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Yayın bulunamadı");
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [streamId]);

  const liveStreams = streams.filter((s) => s.status === "live");

  // Stream detail view
  if (selectedStream) {
    return (
      <div className="min-h-screen">
        {/* Player Area */}
        <div className="aspect-video bg-black/50 backdrop-blur-sm flex items-center justify-center relative rounded-xl mx-4 mt-4 overflow-hidden border border-white/10">
          <div className="text-white text-4xl">🎬</div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold">CANLI</div>
            <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-white text-xs">
              {selectedStream.viewerCount.toLocaleString()} izleyici
            </div>
          </div>
        </div>

        {/* Stream Info */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-[#050505]/60 backdrop-blur-md border border-white/10">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-full shrink-0"
              style={{
                backgroundImage: selectedStream.streamer
                  ? `linear-gradient(135deg, ${selectedStream.streamer.avatarGradient[0]}, ${selectedStream.streamer.avatarGradient[1]})`
                  : "linear-gradient(135deg, #333, #666)",
              }}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{selectedStream.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-400 font-medium">{selectedStream.streamer?.displayName}</span>
                {selectedStream.streamer?.isVerified && (
                  <span className="text-purple-400">✓</span>
                )}
              </div>
              {selectedStream.category && (
                <div className="mt-2">
                  <span className="text-sm px-2 py-1 rounded bg-white/10 text-zinc-300">
                    {selectedStream.category.name}
                  </span>
                </div>
              )}
            </div>
            <button className="px-6 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors">
              Takip Et
            </button>
          </div>
          {selectedStream.description && (
            <p className="mt-4 text-zinc-400">{selectedStream.description}</p>
          )}
        </div>

        {/* Back Button */}
        <div className="p-4 mx-4">
          <button
            onClick={() => setSelectedStream(null)}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Yayınlara Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Canlı Yayınlar</h1>
        <p className="text-zinc-400">En popüler yayınları keşfet</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab("browse")}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === "browse"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-zinc-400 hover:text-zinc-200"
            }`}
        >
          Göz At
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === "categories"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-zinc-400 hover:text-zinc-200"
            }`}
        >
          Kategoriler
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
        </div>
      ) : activeTab === "browse" ? (
        <>
          {/* Live Streams Grid */}
          {liveStreams.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📺</div>
              <p className="text-zinc-400 text-lg">Şu anda canlı yayın yok</p>
              <p className="text-zinc-500 text-sm mt-1">Daha sonra tekrar kontrol edin</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveStreams.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStream(stream)}
                  className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/10 transition-colors text-left group border border-white/5"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-black/30 relative flex items-center justify-center">
                    <span className="text-4xl">🎮</span>
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-white text-xs font-bold">
                      CANLI
                    </div>
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                      {stream.viewerCount.toLocaleString()} izleyici
                    </div>
                    {stream.isNsfw && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-orange-600 text-white text-xs font-bold">
                        18+
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex gap-3">
                    <div
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{
                        backgroundImage: stream.streamer
                          ? `linear-gradient(135deg, ${stream.streamer.avatarGradient[0]}, ${stream.streamer.avatarGradient[1]})`
                          : "linear-gradient(135deg, #333, #666)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                        {stream.title}
                      </p>
                      <p className="text-sm text-zinc-400 truncate">
                        {stream.streamer?.displayName || "Unknown"}
                      </p>
                      {stream.category && (
                        <p className="text-xs text-zinc-500 truncate mt-1">
                          {stream.category.name}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Categories Grid */}
          {categories.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-zinc-400 text-lg">Henüz kategori yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/10 transition-colors cursor-pointer group border border-white/5"
                >
                  {/* Category Icon */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center">
                    <span className="text-5xl">🎮</span>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                      {category.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {category.streamCount?.toLocaleString() || 0} canlı
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
