import { useState, useEffect } from "react";
import { getBans, unbanMember } from "../serversApi";
import type { Ban } from "../../../api/types";

interface BansListProps {
    serverId: string;
}

export function BansList({ serverId }: BansListProps) {
    const [bans, setBans] = useState<Ban[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBans = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBans(serverId);
            setBans(data);
        } catch (e) {
            setError("Failed to load bans");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBans();
    }, [serverId]);

    const handleUnban = async (userId: string) => {
        try {
            await unbanMember(serverId, userId);
            setBans(prev => prev.filter(b => b.userId !== userId));
        } catch (e) {
            console.error("Failed to unban:", e);
            // Optionally show error toast
        }
    };

    if (loading) {
        return <div className="text-zinc-500 text-center py-8">Loading bans...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-center py-8">{error}</div>;
    }

    if (bans.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No Bans</h3>
                <p className="text-sm text-zinc-500">There are no banned users in this server.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bans.map((ban) => (
                <div key={ban.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                    <div>
                        <div className="text-sm font-medium text-zinc-200">User ID: {ban.userId}</div>
                        {ban.reason && (
                            <div className="text-xs text-zinc-500 mt-1">Reason: {ban.reason}</div>
                        )}
                        <div className="text-xs text-zinc-600 mt-0.5">Banned by: {ban.bannedBy}</div>
                    </div>
                    <button
                        onClick={() => handleUnban(ban.userId)}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-xs font-medium transition-colors"
                    >
                        Revoke Ban
                    </button>
                </div>
            ))}
        </div>
    );
}
