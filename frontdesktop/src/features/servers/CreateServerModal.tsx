// ============================================================================
// Create Server Modal Component
// ============================================================================

import { useState } from "react";
import { createServer } from "./serversApi";

interface CreateServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onServerCreated: (serverId: string) => void;
}

export function CreateServerModal({ isOpen, onClose, onServerCreated }: CreateServerModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Sunucu adı gerekli");
            return;
        }

        if (name.length < 2 || name.length > 32) {
            setError("Sunucu adı 2-32 karakter arasında olmalı");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const server = await createServer({
                name: name.trim(),
                description: description.trim() || undefined,
                isPublic,
            });

            // Reset form
            setName("");
            setDescription("");
            setIsPublic(false);

            onServerCreated(server.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sunucu oluşturulamadı");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName("");
        setDescription("");
        setIsPublic(false);
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
                    <h3 className="text-lg font-bold text-white">Sunucu Oluştur</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                        Kendi topluluğunuzu başlatın
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Server Icon Placeholder */}
                    <div className="flex justify-center mb-6">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
                        >
                            {name ? name[0].toUpperCase() : "?"}
                        </div>
                    </div>

                    {/* Server Name */}
                    <div>
                        <label htmlFor="server-name" className="block text-sm font-medium text-zinc-300 mb-2">
                            Sunucu Adı
                        </label>
                        <input
                            id="server-name"
                            name="server-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Muhteşem Sunucum"
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            autoFocus
                        />
                    </div>

                    {/* Description (Optional) */}
                    <div>
                        <label htmlFor="server-desc" className="block text-sm font-medium text-zinc-300 mb-2">
                            Açıklama <span className="text-zinc-500">(İsteğe bağlı)</span>
                        </label>
                        <textarea
                            id="server-desc"
                            name="server-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Bu sunucu ne hakkında?"
                            rows={3}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                        />
                    </div>

                    {/* Privacy Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <input
                            id="is-public"
                            name="is-public"
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="w-5 h-5 rounded border-zinc-600 text-purple-600 focus:ring-purple-500 bg-transparent"
                        />
                        <label htmlFor="is-public" className="text-sm select-none cursor-pointer">
                            <span className="block text-white font-medium">Topluluğa Açık</span>
                            <span className="block text-zinc-500 text-xs mt-0.5">
                                Sunucunuz "Keşfet" sayfasında listelenir
                            </span>
                        </label>
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
                                "Oluştur"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
