// ============================================================================
// EmojiPicker - Simple Emoji Picker Component
// ============================================================================
// A lightweight emoji picker without external dependencies.
// Works with React 19 (no peer dependency issues).

import { useState } from "react";

// Popular emoji categories
const EMOJI_CATEGORIES = {
    "Sık Kullanılan": ["😀", "😂", "😍", "🥰", "😊", "😎", "🤔", "👍", "👏", "❤️", "🔥", "🎉"],
    "Yüzler": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥"],
    "Eller": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
    "Kalpler": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
    "Semboller": ["✅", "❌", "⭐", "🔥", "💯", "💢", "💥", "💫", "💦", "💨", "🎵", "🎶", "✨", "⚡", "☀️", "🌙", "⭕", "❗", "❓", "❕", "❔"],
    "Objeler": ["🎁", "🎈", "🎉", "🎊", "🎮", "🎯", "🎲", "🔔", "🔕", "📢", "📣", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🀄"],
};

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const [activeCategory, setActiveCategory] = useState<string>("Sık Kullanılan");

    const categories = Object.keys(EMOJI_CATEGORIES);

    return (
        <div className="w-80 bg-[#1a1a20] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Emoji</span>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 p-2 border-b border-white/5 overflow-x-auto">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${activeCategory === cat
                                ? "bg-purple-600 text-white"
                                : "text-zinc-400 hover:text-white hover:bg-white/10"
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Emoji grid */}
            <div className="p-2 h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                    {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, i) => (
                        <button
                            key={`${emoji}-${i}`}
                            onClick={() => {
                                onSelect(emoji);
                                onClose();
                            }}
                            className="w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-white/10 transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
