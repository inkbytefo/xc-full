// ============================================================================
// Create Channel Modal Component (Aligned with Backend API)
// ============================================================================

import { useState } from "react";
import { createChannel } from "./serversApi";

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    onChannelCreated: () => void;
    parentId?: string; // Pre-selected category
}

// Simplified channel types: text, announcement, hybrid, category
type ChannelType = "text" | "announcement" | "hybrid" | "category";

interface ChannelTypeOption {
    type: ChannelType;
    label: string;
    icon: string;
    description: string;
}

const CHANNEL_TYPES: ChannelTypeOption[] = [
    {
        type: "text",
        label: "Metin Kanalı",
        icon: "#",
        description: "Sadece metin tabanlı sohbet",
    },
    {
        type: "announcement",
        label: "Duyuru Kanalı",
        icon: "📢",
        description: "Sadece yöneticiler mesaj gönderebilir",
    },
    {
        type: "hybrid",
        label: "Hibrit Kanal",
        icon: "💬",
        description: "Metin + Ses + Video bir arada",
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
    parentId,
}: CreateChannelModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<ChannelType>("text");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Kanal adı gerekli");
            return;
        }

        if (trimmedName.length > 100) {
            setError("Kanal adı en fazla 100 karakter olabilir");
            return;
        }

        if (description.length > 500) {
            setError("Açıklama en fazla 500 karakter olabilir");
            return;
        }

        setLoading(true);
        setError(null);

        // Format name: kebab-case for non-category channels
        let channelName = trimmedName;
        if (type !== "category") {
            channelName = channelName.toLowerCase().replace(/\s+/g, "-");
        }

        try {
            // Unified API call for all channel types
            await createChannel(serverId, {
                name: channelName,
                type,
                description: description.trim() || undefined,
                parentId: parentId || undefined,
            });

            // Reset form
            resetForm();
            onChannelCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Kanal oluşturulamadı");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setType("text");
        setDescription("");
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    const getTypeIcon = (t: ChannelType) => {
        return CHANNEL_TYPES.find((ct) => ct.type === t)?.icon ?? "#";
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
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
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {CHANNEL_TYPES.map((ct) => (
                                <button
                                    key={ct.type}
                                    type="button"
                                    onClick={() => setType(ct.type)}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${type === ct.type
                                        ? "border-purple-500 bg-purple-500/10"
                                        : "border-white/10 bg-white/5 hover:bg-white/10"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{ct.icon}</span>
                                        <span
                                            className={`text-sm font-medium ${type === ct.type ? "text-purple-400" : "text-white"
                                                }`}
                                        >
                                            {ct.label}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            {CHANNEL_TYPES.find((ct) => ct.type === type)?.description}
                        </p>
                    </div>

                    {/* Channel Name */}
                    <div>
                        <label
                            htmlFor="channel-name"
                            className="block text-sm font-medium text-zinc-300 mb-2"
                        >
                            Kanal Adı
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">
                                {getTypeIcon(type)}
                            </span>
                            <input
                                id="channel-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="genel-sohbet"
                                maxLength={100}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {type !== "category"
                                ? "Boşluklar tire (-) ile değiştirilir"
                                : "Kategori isimleri serbest formatta olabilir"}
                        </p>
                    </div>

                    {/* Description (Optional) - not shown for category */}
                    {type !== "category" && (
                        <div>
                            <label
                                htmlFor="channel-desc"
                                className="block text-sm font-medium text-zinc-300 mb-2"
                            >
                                Açıklama{" "}
                                <span className="text-zinc-500">(İsteğe bağlı)</span>
                            </label>
                            <textarea
                                id="channel-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Bu kanal ne için?"
                                maxLength={500}
                                rows={2}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                            />
                        </div>
                    )}

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
