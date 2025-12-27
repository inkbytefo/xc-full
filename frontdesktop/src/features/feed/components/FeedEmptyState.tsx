// ============================================================================
// FeedEmptyState - Premium Empty State with 3D Icon
// ============================================================================

interface FeedEmptyStateProps {
    filter: string;
}

export function FeedEmptyState({ filter }: FeedEmptyStateProps) {
    const getMessage = () => {
        switch (filter) {
            case "friends":
                return "Takip ettiğin kişilerden henüz gönderi yok";
            case "servers":
                return "Sunuculardan henüz gönderi yok";
            default:
                return "Henüz gönderi yok";
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-16">
            {/* 3D-style icon container */}
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-10 h-10 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                    </svg>
                </div>
            </div>

            <p className="text-zinc-400 font-medium text-lg">{getMessage()}</p>
            <p className="text-zinc-600 text-sm mt-2">İlk gönderiyi sen paylaş!</p>
        </div>
    );
}
