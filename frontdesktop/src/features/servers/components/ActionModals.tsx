import { useState } from "react";
import { banMember, timeoutMember } from "../serversApi";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    userId: string;
    userName: string;
    onSuccess?: () => void;
}

export function BanModal({ isOpen, onClose, serverId, userId, userName, onSuccess }: ModalProps) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleBan = async () => {
        setLoading(true);
        try {
            await banMember(serverId, userId, reason);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0f0f15] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Ban {userName}</h3>
                <p className="text-sm text-zinc-400 mb-4">Are you sure you want to ban this user? This action can be undone.</p>

                <input
                    type="text"
                    placeholder="Reason for ban"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-red-500 mb-6"
                />

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
                    <button
                        onClick={handleBan}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md disabled:opacity-50"
                    >
                        {loading ? "Banning..." : "Ban Member"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function TimeoutModal({ isOpen, onClose, serverId, userId, userName, onSuccess }: ModalProps) {
    const [duration, setDuration] = useState("60"); // 1 min default
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleTimeout = async () => {
        setLoading(true);
        try {
            await timeoutMember(serverId, userId, parseInt(duration), reason);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0f0f15] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Timeout {userName}</h3>
                <p className="text-sm text-zinc-400 mb-4">Temporarily disable communication for this user.</p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Duration</label>
                        <select
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="60">1 Minute</option>
                            <option value="300">5 Minutes</option>
                            <option value="600">10 Minutes</option>
                            <option value="3600">1 Hour</option>
                            <option value="86400">1 Day</option>
                            <option value="604800">1 Week</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Reason</label>
                        <input
                            type="text"
                            placeholder="Reason for timeout"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
                    <button
                        onClick={handleTimeout}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md disabled:opacity-50"
                    >
                        {loading ? "Timing out..." : "Timeout Member"}
                    </button>
                </div>
            </div>
        </div>
    );
}
