import type { Stream } from "../../../api/types";

interface LiveStreamsGridProps {
  streams: Stream[];
  onOpenStream: (streamId: string) => void;
}

function StreamAvatar({ stream }: { stream: Stream }) {
  const gradient = stream.streamer?.avatarGradient ?? ["#333", "#666"];
  return (
    <div
      className="w-10 h-10 rounded-full shrink-0"
      style={{ backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    />
  );
}

export function LiveStreamsGrid({ streams, onOpenStream }: LiveStreamsGridProps) {
  if (streams.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {streams.map((stream) => (
        <button
          key={stream.id}
          type="button"
          onClick={() => onOpenStream(stream.id)}
          className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/10 transition-colors text-left group border border-white/5"
        >
          <div className="aspect-video bg-black/30 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-black/40" />
            <div className="relative text-4xl">🎮</div>
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-white text-xs font-bold">
              CANLI
            </div>
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
              {stream.viewerCount.toLocaleString()} izleyici
            </div>
            {stream.isNsfw ? (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-orange-600 text-white text-xs font-bold">
                18+
              </div>
            ) : null}
          </div>

          <div className="p-3 flex gap-3">
            <StreamAvatar stream={stream} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                {stream.title}
              </p>
              <p className="text-sm text-zinc-400 truncate">
                {stream.streamer?.displayName ?? "Unknown"}
              </p>
              {stream.category ? (
                <p className="text-xs text-zinc-500 truncate mt-1">{stream.category.name}</p>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

