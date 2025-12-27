// ============================================================================
// MessageInput - Text input with emoji picker and actions
// ============================================================================

import { useState } from "react";
import type { MessageInputProps } from "./types";
import { PlusIcon, EmojiIcon, GiftIcon } from "../Icons";
import { EmojiPicker } from "../../../../components/EmojiPicker";

// Megaphone icon for announcement channels
function MegaphoneIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
        </svg>
    );
}

export function MessageInput({
    value,
    onChange,
    onSend,
    placeholder,
    disabled = false,
    readOnly = false,
    readOnlyMessage = "Bu kanala sadece yöneticiler mesaj gönderebilir.",
    variant = "full",
}: MessageInputProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        onChange(value + emoji);
    };

    // Read-only mode for announcement channels
    if (readOnly) {
        return (
            <div className={`${variant === "panel" ? "p-3" : "p-4"} shrink-0 border-t border-white/10 bg-[#0a0a0f]/60 backdrop-blur-md`}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                    <MegaphoneIcon className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-yellow-200/70">{readOnlyMessage}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${variant === "panel" ? "p-3" : "p-4"} shrink-0 border-t border-white/10 bg-[#0a0a0f]/60 backdrop-blur-md`}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <button className="text-zinc-400 hover:text-zinc-300" title="Dosya Ekle">
                    <PlusIcon className="w-5 h-5" />
                </button>
                <input
                    type="text"
                    name="message-input"
                    id="message-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none disabled:opacity-50"
                    autoComplete="off"
                />
                <div className="flex items-center gap-2 text-zinc-400 relative">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`hover:text-zinc-300 ${showEmojiPicker ? "text-purple-400" : ""}`}
                        title="Emoji"
                    >
                        <EmojiIcon className="w-5 h-5" />
                    </button>
                    <button className="hover:text-zinc-300" title="GIF">
                        <GiftIcon className="w-5 h-5" />
                    </button>

                    {/* Emoji Picker Popup */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-10 right-0 z-50">
                            <EmojiPicker
                                onSelect={handleEmojiSelect}
                                onClose={() => setShowEmojiPicker(false)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
