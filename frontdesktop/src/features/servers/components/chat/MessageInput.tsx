// ============================================================================
// MessageInput - Text input with emoji picker and actions
// ============================================================================

import { useState } from "react";
import type { MessageInputProps } from "./types";
import { PlusIcon, EmojiIcon, GiftIcon } from "../Icons";
import { EmojiPicker } from "../../../../components/EmojiPicker";

export function MessageInput({
    value,
    onChange,
    onSend,
    placeholder,
    disabled = false,
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
