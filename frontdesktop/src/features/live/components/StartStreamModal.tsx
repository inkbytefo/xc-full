import { useState, useEffect } from "react";
import { getMyStream, updateMyStream, startStream, regenerateStreamKey, fetchCategories } from "../liveApi";
// Types used by API calls - Stream and Category are inferred from API responses
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveKeys } from "../hooks/liveKeys";

interface StartStreamModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StartStreamModal({ isOpen, onClose }: StartStreamModalProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [isNsfw, setIsNsfw] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Fetch existing stream info
    const { data: stream, isLoading: isLoadingStream, refetch } = useQuery({
        queryKey: ["my-stream"],
        queryFn: getMyStream,
        retry: false,
    });

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: liveKeys.categories(),
        queryFn: fetchCategories,
    });

    // Populate form when stream data loads
    useEffect(() => {
        if (stream) {
            setTitle(stream.title);
            setDescription(stream.description || "");
            setCategoryId(stream.category?.id || "");
            setIsNsfw(stream.isNsfw ?? false);
        }
    }, [stream]);

    // Create/Update mutations
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (stream) {
                return updateMyStream({ title, description, categoryId, isNsfw });
            } else {
                return startStream({ title, description, categoryId, isNsfw });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-stream"] });
            refetch();
        }
    });

    const regenerateKeyMutation = useMutation({
        mutationFn: regenerateStreamKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-stream"] });
            refetch();
        }
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate();
    };

    // Default Ingest URL (Ideally comes from backend config/stream object)
    // The backend stores it in `ingest_url` but let's have a fallback
    const ingestUrl = stream?.ingestUrl || "rtmp://localhost:1935/live";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="text-red-500">◉</span> Go Live
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">

                    {isLoadingStream ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Stream Settings Form */}
                            <form id="stream-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Stream Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        placeholder="What are you streaming today?"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        >
                                            <option value="">Select a category</option>
                                            {categories?.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isNsfw}
                                                onChange={(e) => setIsNsfw(e.target.checked)}
                                                className="w-5 h-5 rounded border-white/20 bg-black/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                                            />
                                            <div>
                                                <div className="text-white font-medium group-hover:text-purple-400 transition-colors">NSFW Content</div>
                                                <div className="text-xs text-zinc-500">Contains mature themes</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                        placeholder="Tell viewers about your stream..."
                                    />
                                </div>
                            </form>

                            {/* Stream Configuration (Keys) */}
                            {stream && (
                                <div className="bg-black/30 rounded-xl p-5 space-y-4 border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-2">Stream Configuration</h3>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Server URL (Ingest)</label>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={ingestUrl}
                                                className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-zinc-300 font-mono text-sm selection:bg-purple-500/30 focus:outline-none"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <button
                                                onClick={() => navigator.clipboard.writeText(ingestUrl)}
                                                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-white text-sm transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Stream Key</label>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                type={showKey ? "text" : "password"}
                                                value={stream.streamKey}
                                                className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-zinc-300 font-mono text-sm selection:bg-purple-500/30 focus:outline-none"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKey(!showKey)}
                                                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-zinc-400 hover:text-white text-sm transition-colors"
                                            >
                                                {showKey ? "Hide" : "Show"}
                                            </button>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(stream.streamKey || "")}
                                                className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-white text-sm transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                        <div className="mt-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => regenerateKeyMutation.mutate()}
                                                className="text-xs text-red-400 hover:text-red-300 underline"
                                            >
                                                Regenerate Key
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-xs text-zinc-500 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        ℹ️ Use the Server URL and Stream Key in your streaming software (OBS, Streamlabs, etc.) to start streaming.
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="stream-form"
                        disabled={saveMutation.isPending}
                        className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saveMutation.isPending ? "Saving..." : (stream ? "Update Settings" : "Create Stream Setup")}
                    </button>
                </div>
            </div>
        </div>
    );
}
