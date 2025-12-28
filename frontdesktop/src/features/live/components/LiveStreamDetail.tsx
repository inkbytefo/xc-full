import type { Stream } from "../../../api/types";

interface LiveStreamDetailProps {
  stream: Stream;
  onBack: () => void;
}

function StreamerAvatar({ stream }: { stream: Stream }) {
  const gradient = stream.streamer?.avatarGradient ?? ["#333", "#666"];
  return (
    <div
      className="w-16 h-16 rounded-full shrink-0"
      style={{ backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    />
  );
}

export function LiveStreamDetail({ stream, onBack }: LiveStreamDetailProps) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="aspect-video bg-black/50 backdrop-blur-sm flex items-center justify-center relative rounded-2xl overflow-hidden border border-white/10">
        <div className="text-white text-4xl">🎬</div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold">CANLI</div>
          <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-white text-xs">
            {stream.viewerCount.toLocaleString()} izleyici
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 p-4">
        <div className="flex items-start gap-4">
          <StreamerAvatar stream={stream} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{stream.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-purple-400 font-medium">{stream.streamer?.displayName ?? "Unknown"}</span>
              {stream.streamer?.isVerified ? <span className="text-purple-400">✓</span> : null}
            </div>
            {stream.category ? (
              <div className="mt-2">
                <span className="text-sm px-2 py-1 rounded bg-white/10 text-zinc-300">
                  {stream.category.name}
                </span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="px-6 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Takip Et
          </button>
        </div>
        {stream.description ? <p className="mt-4 text-zinc-400">{stream.description}</p> : null}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          ← Yayınlara Dön
        </button>
      </div>
    </div>
  );
}

