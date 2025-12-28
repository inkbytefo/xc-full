import { VideoPlayer } from "./VideoPlayer";
import { StreamChat } from "./StreamChat";
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
  // If stream is offline, we might want to show VODs instead, but for now just show player space.

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left/Main Column: Video & Info */}
      <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none">

        {/* Video Player Container */}
        <div className="w-full aspect-video bg-black sticky top-0 z-10">
          <VideoPlayer streamId={stream.id} muted={true} />
        </div>

        {/* Stream Info */}
        <div className="p-6">
          <button
            onClick={onBack}
            className="mb-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
          >
            ← Back to Browse
          </button>

          <div className="flex items-start gap-4">
            <StreamerAvatar stream={stream} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{stream.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-400 font-medium text-lg">{stream.streamer?.displayName ?? "Unknown"}</span>
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
            <div className="flex gap-2">
              <div className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-bold animate-pulse">
                LIVE
              </div>
              <div className="px-3 py-1.5 rounded bg-white/10 text-zinc-300 text-sm font-medium">
                {stream.viewerCount.toLocaleString()} viewers
              </div>
            </div>
          </div>

          {stream.description ? (
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-zinc-400 mb-2">ABOUT STREAM</h3>
              <p className="text-zinc-300 whitespace-pre-wrap">{stream.description}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right Column: Chat (Fixed width on desktop, stacked on mobile) */}
      <div className="w-full md:w-[350px] shrink-0 h-[500px] md:h-full border-l border-white/5 bg-black/40">
        <StreamChat streamId={stream.id} />
      </div>
    </div>
  );
}

