import type { Category } from "../../../api/types";

interface LiveCategoryRailProps {
    categories: Category[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export function LiveCategoryRail({ categories, selectedId, onSelect }: LiveCategoryRailProps) {
    return (
        <div className="w-full relative group">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-4 mask-fade-right">
                <button
                    onClick={() => onSelect(null)}
                    className={`
                shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${!selectedId
                            ? "bg-white text-black shadow-lg shadow-white/10 scale-105"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                        }
            `}
                >
                    All Channels
                </button>

                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id === selectedId ? null : cat.id)}
                        className={`
                    shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                    ${cat.id === selectedId
                                ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20 scale-105"
                                : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white hover:bg-white/5"
                            }
                `}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
            {/* Fade Effect on right */}
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
        </div>
    );
}
