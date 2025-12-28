import { useEffect, useState } from "react";
import { getServerWall, type ServerWallPost } from "../serverWallApi";
import type { ServerMember } from "../hooks/useServerMembers";

function formatRelativeTime(iso: string): string {
    const t = new Date(iso).getTime();
    const diffMs = Date.now() - t;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}dk`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}sa`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}g`;
    return new Date(iso).toLocaleDateString();
}

interface ServerWallTabProps {
    serverId: string;
    members: ServerMember[];
}

export function ServerWallTab({ serverId, members }: ServerWallTabProps) {
    const [posts, setPosts] = useState<ServerWallPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPosts();
    }, [serverId]);

    async function loadPosts() {
        try {
            setLoading(true);
            const res = await getServerWall(serverId);
            setPosts(res.data);
        } catch (err) {
            console.error("Failed to load wall posts:", err);
            setError("Duvar gönderileri yüklenemedi");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
                <p>{error}</p>
                <button
                    onClick={() => loadPosts()}
                    className="mt-2 text-sm text-zinc-400 hover:text-white underline"
                >
                    Tekrar dene
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                </div>
                <p className="font-medium">Henüz gönderi yok</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 py-4">
            {posts.map((post) => {
                const author = members.find(m => m.id === post.authorId);
                const displayName = author?.displayName || "Unknown Member";
                const handle = author?.handle || "unknown";
                const avatarGradient = author?.avatarGradient || ["#333", "#666"];

                return (
                    <article
                        key={post.id}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm transition-all hover:bg-black/40"
                    >
                        {post.isPinned && (
                            <div className="flex items-center gap-2 mb-2 text-xs text-amber-400 font-medium">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Sabitlenmiş
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-full shrink-0"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`
                                }}
                            />

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-zinc-100">
                                                {displayName}
                                            </span>
                                            <span className="truncate text-xs text-zinc-500">@{handle}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-xs text-zinc-500">
                                        {formatRelativeTime(post.createdAt)}
                                    </div>
                                </div>

                                <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
                                    {post.content.split(/(#\w+)/g).map((part, i) => {
                                        if (part.startsWith("#")) {
                                            return (
                                                <span key={i} className="text-pink-400 font-medium cursor-pointer hover:underline">
                                                    {part}
                                                </span>
                                            );
                                        }
                                        return part;
                                    })}
                                </div>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
