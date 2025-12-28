// ============================================================================
// Voice Channel Component - Channel UI with participants
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import type { Channel } from "../../../api/types";
import { getVoiceChannels } from "../api/serverVoiceApi";
import { useMediaSession } from "../hooks";

interface VoiceChannelListProps {
    serverId: string;
    serverName?: string;
}

export function VoiceChannelList({ serverId, serverName = "" }: VoiceChannelListProps) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    const {
        context,
        connection,
        participants,
        error,
        joinServerChannel,
        endSession,
    } = useMediaSession();

    const isConnected = connection === "connected";
    const isConnecting = connection === "connecting";
    const activeChannelId = context.channelId;

    // Load voice channels
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getVoiceChannels(serverId);
                setChannels(data);
            } catch (err) {
                console.error("Failed to load voice channels:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [serverId]);

    // Handle channel click
    const handleChannelClick = useCallback((channel: Channel) => {
        if (isConnected && activeChannelId === channel.id) {
            // Already in this channel, disconnect
            endSession();
        } else {
            // Join new channel
            joinServerChannel({
                serverId,
                serverName,
                channelId: channel.id,
                channelName: channel.name,
                channelType: channel.type as "voice" | "video" | "hybrid",
            }).catch(console.error);
        }
    }, [isConnected, activeChannelId, serverId, serverName, joinServerChannel, endSession]);

    if (loading) {
        return (
            <div className="p-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            </div>
        );
    }

    if (channels.length === 0) {
        return null;
    }

    return (
        <div className="mt-4">
            <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Ses Kanalları
            </div>

            {channels.map((channel) => {
                const isActive = activeChannelId === channel.id && isConnected;

                return (
                    <div key={channel.id}>
                        <button
                            onClick={() => handleChannelClick(channel)}
                            className={`w-full px-2 py-1.5 text-left rounded-md flex items-center gap-2 transition-colors ${isActive
                                ? "bg-green-500/20 text-green-400"
                                : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                                }`}
                        >
                            {/* Voice/Video icon */}
                            <span className="text-lg">
                                {channel.type === "video" ? "📹" : channel.type === "stage" ? "🎭" : "🔊"}
                            </span>
                            <span className="flex-1 truncate">{channel.name}</span>
                            {(channel.participantCount ?? 0) > 0 && (
                                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                                    {channel.participantCount}
                                </span>
                            )}
                        </button>

                        {/* Show participants when connected */}
                        {isActive && (
                            <div className="ml-6 mt-1 space-y-1">
                                {participants.map((p) => (
                                    <div
                                        key={p.sid}
                                        className="flex items-center gap-2 px-2 py-1 text-sm"
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${p.isSpeaking ? "bg-green-500 animate-pulse" : "bg-zinc-600"
                                                }`}
                                        />
                                        <span className={p.isMuted ? "text-zinc-500" : "text-zinc-300"}>
                                            {p.identity}
                                            {p.isLocal && " (Sen)"}
                                        </span>
                                        {p.isMuted && (
                                            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                            </svg>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}


            {/* Connection status */}
            {isConnecting && (
                <div className="mt-2 px-2 text-xs text-zinc-500 flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-green-500" />
                    Bağlanıyor...
                </div>
            )}

            {error && (
                <div className="mt-2 px-2 text-xs text-red-400">
                    Hata: {error}
                </div>
            )}
        </div>
    );
}
