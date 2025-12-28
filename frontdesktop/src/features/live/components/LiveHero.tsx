import { useNavigate } from "react-router-dom";
import type { Stream } from "../../../api/types";

interface LiveHeroProps {
    stream?: Stream;
}

export function LiveHero({ stream }: LiveHeroProps) {
    const navigate = useNavigate();

    if (!stream) {
        // Skeleton / Placeholder state
        return (
            <div className="w-full aspect-[21/9] md:aspect-[3/1] bg-white/5 rounded-2xl animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] animate-shimmer" />
            </div>
        );
    }

    const gradient = stream.streamer?.avatarGradient ?? ["#333", "#666"];

    return (
        <div
            className="relative w-full aspect-[16/9] md:aspect-[3/1] rounded-2xl overflow-hidden group cursor-pointer border border-white/5"
            onClick={() => navigate(`/live/${stream.id}`)}
        >
            {/* Background / Thumbnail */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                    backgroundColor: "#000",
                    // In real app, use stream thumbnail. Fallback to gradient for now.
                    backgroundImage: `linear-gradient(to bottom right, ${gradient[0]}88, ${gradient[1]}88)`
                }}
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold tracking-wider rounded uppercase animate-pulse shadow-lg shadow-red-600/20">
                        Live Now
                    </div>
                    {stream.category && (
                        <div className="px-3 py-1 bg-white/10 backdrop-blur-md text-zinc-200 text-xs font-medium rounded border border-white/10">
                            {stream.category.name}
                        </div>
                    )}
                </div>

                <h1 className="text-2xl md:text-5xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2">
                    {stream.title}
                </h1>

                <div className="flex items-center gap-4 mt-2">
                    <div
                        className="w-12 h-12 rounded-full ring-2 ring-white/20 p-0.5"
                        style={{ backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-lg">{stream.streamer?.displayName}</span>
                            {stream.streamer?.isVerified && <span className="text-purple-400">✓</span>}
                        </div>
                        <div className="text-zinc-400 text-sm">
                            {stream.viewerCount.toLocaleString()} viewers watching
                        </div>
                    </div>
                </div>
            </div>

            {/* Play Button Overlay (Show on Hover) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transform group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                </div>
            </div>
        </div>
    );
}
