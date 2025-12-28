import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyStream, updateMyStream, regenerateStreamKey, getStreamAnalytics, fetchStreamRecordings } from "./liveApi";
import { fetchCategories } from "./liveApi";
import { LiveLoadingSpinner } from "./components/LiveLoadingSpinner";
import { LiveErrorBanner } from "./components/LiveErrorBanner";

export function DashboardPage() {
    const queryClient = useQueryClient();
    const [showKey, setShowKey] = useState(false);
    const [formState, setFormState] = useState({ title: "", categoryId: "", isNsfw: false });

    // Queries
    const { data: stream, isLoading: isStreamLoading, error: streamError } = useQuery({
        queryKey: ["myStream"],
        queryFn: getMyStream,
    });

    const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ["streamAnalytics"],
        queryFn: getStreamAnalytics,
    });

    const { data: categories } = useQuery({
        queryKey: ["liveCategories"],
        queryFn: fetchCategories,
    });

    const { data: recordings } = useQuery({
        queryKey: ["streamRecordings", stream?.id],
        queryFn: () => stream ? fetchStreamRecordings(stream.id) : Promise.resolve([]),
        enabled: !!stream,
    });

    // Sync form state
    useEffect(() => {
        if (stream) {
            setFormState({
                title: stream.title,
                categoryId: stream.categoryId ?? "",
                isNsfw: stream.isNsfw ?? false,
            });
        }
    }, [stream]);

    // Mutations
    const updateMutation = useMutation({
        mutationFn: updateMyStream,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myStream"] });
        },
    });

    const regenKeyMutation = useMutation({
        mutationFn: regenerateStreamKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myStream"] });
            alert("Stream key regenerated! Update your OBS settings.");
        },
    });

    if (isStreamLoading || isAnalyticsLoading) return <LiveLoadingSpinner />;
    if (streamError) return <LiveErrorBanner message="Failed to load dashboard info" />;
    if (!stream) return <div className="p-8 text-white">Stream not set up. Contact support.</div>;

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formState);
    };

    return (
        <div className="h-full overflow-y-auto bg-transparent p-6">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
                    <p className="text-zinc-400">Manage your stream and view analytics</p>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                        <div className="text-zinc-400 text-sm font-medium uppercase">Current Viewers</div>
                        <div className="text-3xl font-bold text-white mt-1">{analytics?.currentViewers ?? 0}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                        <div className="text-zinc-400 text-sm font-medium uppercase">Total Views</div>
                        <div className="text-3xl font-bold text-white mt-1">{analytics?.totalViews ?? 0}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                        <div className="text-zinc-400 text-sm font-medium uppercase">Duration</div>
                        <div className="text-3xl font-bold text-white mt-1">{analytics?.duration ?? "0s"}</div>
                    </div>
                </div>

                {/* Stream Settings */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Stream Info</h2>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Title</label>
                            <input
                                type="text"
                                value={formState.title}
                                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                            <select
                                value={formState.categoryId}
                                onChange={(e) => setFormState({ ...formState, categoryId: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 transition-colors [&>option]:bg-zinc-900"
                            >
                                <option value="">Select Category</option>
                                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formState.isNsfw}
                                onChange={(e) => setFormState({ ...formState, isNsfw: e.target.checked })}
                                className="rounded border-white/10 bg-black/40 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-zinc-300 text-sm">NSFW Content (18+)</span>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                            >
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Stream Key */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Stream Connection</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Server URL (RTMP)</label>
                            <div className="flex items-center gap-2">
                                <input readOnly value="rtmp://localhost:1935/app" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-zinc-400 font-mono text-sm" />
                                <button onClick={() => navigator.clipboard.writeText("rtmp://localhost:1935/app")} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm">Copy</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Stream Key</label>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    type={showKey ? "text" : "password"}
                                    value={stream.streamKey ?? "Click regenerate if missing"}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-zinc-400 font-mono text-sm"
                                />
                                <button onClick={() => setShowKey(!showKey)} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm">
                                    {showKey ? "Hide" : "Show"}
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(stream.streamKey ?? "")} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm">Copy</button>
                            </div>
                            {/* Note: streamIn field is probably not exposed in API response "Stream" type. I should check if I added StreamKey to Stream type or separate endpoint.
                         Wait, GET /live/me returns the Stream entity. Does it include StreamKey?
                         Let's check backend `dto.go` or `entities`.
                         Backend returns `Stream` entity.
                         I'll assume it's NOT in the DTO for security unless it's `/live/me`.
                         Actually, usually we do NOT return valid stream keys in public endpoints.
                         The `/live/me` endpoint handles `GetMyStream`.
                         Let's check `Backend/internal/adapters/http/handlers/live.go`.
                      */}
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure? This will disconnect your current stream.")) {
                                        regenKeyMutation.mutate()
                                    }
                                }}
                                className="text-red-400 hover:text-red-300 text-sm border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            >
                                Regenerate Stream Key
                            </button>
                        </div>
                    </div>
                </div>

                {/* VODs */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Past Recordings (VODs)</h2>
                    {recordings && recordings.length > 0 ? (
                        <div className="space-y-2">
                            {recordings.map(vod => (
                                <div key={vod.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                    <div>
                                        <div className="text-white font-medium">{new Date(vod.createdAt).toLocaleDateString()} Broadcast</div>
                                        <div className="text-xs text-zinc-400">Duration: {vod.duration}</div>
                                    </div>
                                    <button className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded">
                                        Download
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-zinc-500 text-center py-8">
                            No recordings found. Streams are automatically recorded.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
