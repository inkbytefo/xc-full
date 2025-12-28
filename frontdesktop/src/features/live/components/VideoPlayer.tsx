import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
    streamId: string;
    poster?: string;
    autoPlay?: boolean;
    muted?: boolean;
}

export function VideoPlayer({ streamId, poster, autoPlay = true, muted = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use OME URL. In production this should be a config.
    // Assuming OME is proxy-passed via Backend or accessible directly.
    // For local dev, Backend is at localhost:8080.
    // The backend has a GET /live/streams/:id/playlist.m3u8 endpoint (Roadmap said so, but implementation?)
    // Let's check router.go again. 
    // I don't recall adding a proxy route for HLS in router.go in Phase 1-5. It was in the roadmap "D. HLS Playlist Endpoint" but did I implement it?
    // Checking router.go...
    // I did NOT implement `GetHLSPlaylist` in the backend code I reviewed.
    // I only enabled File publisher in Phase 5.
    // Wait, `ome-config/Server.xml` enables LL-HLS on port 3333.
    // If I'm running locally, I can hit http://localhost:3333/app/<streamId>/llhls.m3u8 directly.
    // But strictly, the frontend should go through the API or a known CDN URL.
    // I will use direct localhost:3333 for now as per `Server.xml` analysis.
    // The path in Server.xml for LLHLS is:
    // <Publishers> <LLHLS> ... </LLHLS> </Publishers>
    // Usually it is `http://<ome_host>:<port>/<app_name>/<stream_name>/llhls.m3u8`

    const streamUrl = `http://localhost:3333/app/${streamId}/llhls.m3u8`;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                backBufferLength: 90,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (autoPlay) {
                    video.play().catch(() => {
                        // Auto-play might fail due to browser policy if not muted
                        console.log("Autoplay blocked");
                    });
                }
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            // Try to recover network error
                            console.log("fatal network error encountered, try to recover");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log("fatal media error encountered, try to recover");
                            hls.recoverMediaError();
                            break;
                        default:
                            // cannot recover
                            hls.destroy();
                            setError(`Playback Error: ${data.details}`);
                            break;
                    }
                }
            });

            hlsRef.current = hls;
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Safari
            video.src = streamUrl;
            video.addEventListener("loadedmetadata", () => {
                if (autoPlay) video.play();
            });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [streamId, streamUrl, autoPlay]);

    return (
        <div className="relative w-full h-full bg-black rounded-xl overflow-hidden group">
            {error ? (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-black/80">
                    {error}
                </div>
            ) : null}

            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                poster={poster}
                controls
                muted={muted}
                playsInline
            />
        </div>
    );
}
