// ============================================================================
// FeedHeader - Twitter-style Header with Blur Backdrop
// ============================================================================

interface FeedHeaderProps {
    onSearchClick?: () => void;
}

export function FeedHeader({ onSearchClick }: FeedHeaderProps) {
    return (
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3">
                <h1 className="text-xl font-bold text-zinc-100">Ana Sayfa</h1>
                <button
                    type="button"
                    onClick={onSearchClick}
                    className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10"
                    title="Ara (Ctrl+K)"
                >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-zinc-300">
                        <path
                            d="M10.5 3a7.5 7.5 0 1 0 4.7 13.4l4.7 4.7 1.4-1.4-4.7-4.7A7.5 7.5 0 0 0 10.5 3Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </header>
    );
}
