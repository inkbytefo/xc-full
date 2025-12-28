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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {streams.map((stream) => (
        <div
          key={stream.id}
          onClick={() => onOpenStream(stream.id)}
          className="group cursor-pointer flex flex-col gap-3"
        >
          {/* Thumbnail Container */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/10 transition-transform duration-300 group-hover:ring-purple-500/50 group-hover:-translate-y-1 shadow-lg shadow-black/20">
            {/* Thumbnail Gradient Placeholder */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{
                // Fallback gradient until we have real thumbnails
                backgroundImage: `linear-gradient(45deg, #1a1a1a, #2a2a2a)`
              }}
            />

            {/* Hover Play Icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
              </div>
            </div>

            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
              Live
            </div>

            <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-xs font-medium">
              {stream.viewerCount.toLocaleString()} viewers
            </div>

            {stream.isNsfw && (
              <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded bg-orange-500/90 text-white text-[10px] font-bold">
                18+
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex gap-3 px-1">
            <div className="shrink-0">
              <StreamAvatar stream={stream} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <h3 className="font-bold text-white text-base leading-tight truncate group-hover:text-purple-400 transition-colors">
                {stream.title}
              </h3>
              <div className="text-zinc-400 text-sm truncate flex items-center gap-1">
                {stream.streamer?.displayName ?? "Unknown"}
                {stream.streamer?.isVerified && <span className="text-purple-400 text-xs">✓</span>}
              </div>
              {stream.category && (
                <div className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors w-fit">
                  {stream.category.name}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

