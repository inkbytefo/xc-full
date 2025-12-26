// ============================================================================
// Create Server Modal Component
// ============================================================================
// Modern split-panel design with live preview

import { useState } from "react";
import { createServer } from "./serversApi";

interface CreateServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onServerCreated: (serverId: string) => void;
}

// Preset banner colors
const BANNER_COLORS = [
    { id: "purple", value: "#7c3aed" },
    { id: "coral", value: "#ef4444" },
    { id: "emerald", value: "#10b981" },
    { id: "cyan", value: "#0ea5e9" },
    { id: "indigo", value: "#4f46e5" },
    { id: "pink", value: "#ec4899" },
];

export function CreateServerModal({ isOpen, onClose, onServerCreated }: CreateServerModalProps) {
    const [name, setName] = useState("");
    const [selectedColor, setSelectedColor] = useState(BANNER_COLORS[0].value);
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
                accent: selectedColor,
            });

            // Reset form
            setName("");
            setSelectedColor(BANNER_COLORS[0].value);

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
        setSelectedColor(BANNER_COLORS[0].value);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    const displayName = name.trim() || "My Awesome Community";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex">
                    {/* Left Panel - Form */}
                    <div className="flex-1 p-6">
                        {/* Header */}
                        <h2 className="text-xl font-bold text-white mb-1">
                            Create a Server
                        </h2>
                        <p className="text-sm text-zinc-500 mb-6">
                            Your server is where you and your friends hang out. Make yours and start talking.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Server Name */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                    Server Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Awesome Community"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Banner Style */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                    Banner Style
                                </label>
                                <div className="flex gap-3">
                                    {BANNER_COLORS.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => setSelectedColor(color.value)}
                                            className={`w-10 h-10 rounded-full transition-all duration-200 ${selectedColor === color.value
                                                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110"
                                                    : "hover:scale-105"
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                            aria-label={`Select ${color.id} color`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim()}
                                    className="px-8 py-2.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Creating...
                                        </span>
                                    ) : (
                                        "Create"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-64 bg-[#08080c] p-6 flex flex-col items-center justify-center relative">
                        {/* Hex Pattern Background */}
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
                                backgroundSize: '30px 30px',
                            }}
                        />

                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-6 relative z-10">
                            Preview
                        </span>

                        {/* Server Card Preview */}
                        <div className="w-full bg-[#0f0f15] rounded-xl overflow-hidden shadow-xl relative z-10">
                            {/* Banner */}
                            <div
                                className="h-16 relative"
                                style={{
                                    background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}99 100%)`
                                }}
                            >
                                {/* Decorative elements */}
                                <div
                                    className="absolute bottom-2 right-2 w-8 h-4 rounded opacity-50"
                                    style={{ backgroundColor: selectedColor, filter: 'brightness(0.7)' }}
                                />
                            </div>

                            {/* Server Icon */}
                            <div className="px-3 -mt-5 relative z-10">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-[#0f0f15]"
                                    style={{
                                        background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}cc 100%)`
                                    }}
                                >
                                    {displayName.substring(0, 2).toUpperCase()}
                                </div>
                            </div>

                            {/* Server Info */}
                            <div className="p-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 bg-zinc-700 rounded flex-1" />
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="h-2 bg-zinc-800 rounded w-2/3" />
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-600 text-center mt-4 relative z-10">
                            This is how your server will appear in the discovery list.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

