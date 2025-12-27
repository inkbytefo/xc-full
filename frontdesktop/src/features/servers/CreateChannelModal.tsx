// ============================================================================
// Create Channel Modal Component
// ============================================================================

import { useState } from "react";
import { createChannel } from "./serversApi";
import { createVoiceChannel } from "../voice/voiceApi";

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    onChannelCreated: () => void;
}

type ChannelType = "text" | "voice" | "announcement" | "category";

const CHANNEL_TYPES: { type: ChannelType; label: string; icon: string; description: string }[] = [
    {
        type: "text",
        label: "Metin Kanalı",
        icon: "#",
        description: "Metin tabanlı sohbet kanalı",
    },
    {
        type: "voice",
        label: "Ses Kanalı",
        icon: "🔊",
        description: "Sesli iletişim kanalı",
    },
    {
        type: "announcement",
        label: "Duyuru Kanalı",
        icon: "📢",
        description: "Sadece yöneticiler mesaj gönderebilir",
    },
    {
        type: "category",
        label: "Kategori",
        icon: "📁",
        description: "Kanalları gruplamak için başlık",
    },
];

export function CreateChannelModal({
    isOpen,
    onClose,
    serverId,
    onChannelCreated,
}: CreateChannelModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<ChannelType>("text");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Kanal adı gerekli");
            return;
        }

        if (name.length < 1 || name.length > 100) {
            setError("Kanal adı 1-100 karakter arasında olmalı");
            return;
        }

        setLoading(true);
        setError(null);

        let channelName = name.trim();
        // Text/Voice channels usually use kebab-case, Categories can be free-text
        if (type !== "category") {
            channelName = channelName.toLowerCase().replace(/\s+/g, "-");
        }

        try {
            // Voice channels use a different API endpoint and table
            if (type === "voice") {
                await createVoiceChannel(serverId, {
                    name: channelName,
                    type: "voice",
                });
            } else {
                // Text and announcement channels
                await createChannel(serverId, {
                    name: channelName,
                    type,
                    description: description.trim() || undefined,
                });
            }

            // Reset form
            setName("");
            setType("text");
            setDescription("");

            onChannelCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kanal oluşturulamadı");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName("");
        setType("text");
        setDescription("");
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <div
                className="w-full max-w-md bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">Kanal Oluştur</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                        Sunucunuz için yeni bir kanal oluşturun
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Channel Type */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Kanal Tipi
                        </label>
                        <div className="space-y-2">
                            {CHANNEL_TYPES.map((ct) => (
                                <button
                                    key={ct.type}
                                    type="button"
                                    onClick={() => setType(ct.type)}
                                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${type === ct.type
                                        ? "border-purple-500 bg-purple-500/10"
                                        : "border-white/10 bg-white/5 hover:bg-white/10"
                                        }`}
                                >
                                    <span className="text-xl w-8 text-center">{ct.icon}</span>
                                    <div>
                                        <div className={`font-medium ${type === ct.type ? "text-purple-400" : "text-white"}`}>
                                            {ct.label}
                                        </div>
                                        <div className="text-xs text-zinc-500">{ct.description}</div>
                                    </div>
                                    {type === ct.type && (
                                        <div className="ml-auto">
                                            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Channel Name */}
                    <div>
                        <label htmlFor="channel-name" className="block text-sm font-medium text-zinc-300 mb-2">
                            Kanal Adı
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">
                                {type === "text" ? "#" : type === "voice" ? "🔊" : type === "announcement" ? "📢" : "📁"}
                            </span>
                            <input
                                id="channel-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="genel-sohbet"
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {type !== "category" ? "Boşluklar tire (-) ile değiştirilir, küçük harfe çevrilir" : "Kategori isimleri serbest formatta olabilir"}
                        </p>
                    </div>

                    {/* Description (Optional) */}
                    <div>
                        <label htmlFor="channel-desc" className="block text-sm font-medium text-zinc-300 mb-2">
                            Açıklama <span className="text-zinc-500">(İsteğe bağlı)</span>
                        </label>
                        <textarea
                            id="channel-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Bu kanal ne için?"
                            rows={2}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors font-medium"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Oluşturuluyor...
                                </span>
                            ) : (
                                "Kanal Oluştur"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
