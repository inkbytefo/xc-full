// ============================================================================
// NewConversationModal - Start New DM Conversation
// ============================================================================

import type { UserProfile } from "../../profile/userApi";

interface NewConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchResults: UserProfile[];
    searching: boolean;
    onSelectUser: (userId: string) => void;
}

export function NewConversationModal({
    isOpen,
    onClose,
    searchQuery,
    onSearchChange,
    searchResults,
    searching,
    onSelectUser,
}: NewConversationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Yeni Mesaj</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-400"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Kullanıcı ara..."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
                        autoFocus
                    />
                </div>

                {/* Results */}
                <div className="max-h-64 overflow-y-auto px-2 pb-4">
                    {searching ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                        </div>
                    ) : searchResults.length === 0 && searchQuery ? (
                        <div className="text-center py-8 text-zinc-500">
                            <p>Kullanıcı bulunamadı</p>
                        </div>
                    ) : (
                        searchResults.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => onSelectUser(user.id)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-full"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${user.avatarGradient[0]}, ${user.avatarGradient[1]})`,
                                    }}
                                />
                                <div className="text-left">
                                    <div className="font-medium text-zinc-100">{user.displayName}</div>
                                    <div className="text-sm text-zinc-500">@{user.handle}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
