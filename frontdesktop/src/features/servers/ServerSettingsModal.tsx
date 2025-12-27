import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Server } from "../../api/types";
import { serverKeys } from "../../lib/query";
import { updateServer, deleteServer } from "./serversApi";

import { BansList } from "./components/BansList";

import { RolesList } from "./components/RolesList";

interface ServerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    server: Server;
    onServerUpdated?: (server: Server) => void;
    onServerDeleted?: () => void;
}

type SettingsTab = "overview" | "moderation" | "roles" | "danger";

export function ServerSettingsModal({
    isOpen,
    onClose,
    server,
    onServerUpdated,
    onServerDeleted,
}: ServerSettingsModalProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
    const [name, setName] = useState(server.name);
    const [description, setDescription] = useState(server.description || "");
    const [isPublic, setIsPublic] = useState(server.isPublic);
    const [tag, setTag] = useState(server.tag || "");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState("");

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const updated = await updateServer(server.id, {
                name,
                description,
                isPublic,
                tag: tag || undefined,
            });
            onServerUpdated?.(updated);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update server");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirm !== server.name) {
            setError("Please type the server name correctly to confirm deletion");
            return;
        }
        setDeleting(true);
        setError(null);
        try {
            await deleteServer(server.id);
            queryClient.removeQueries({ queryKey: serverKeys.detail(server.id) });
            queryClient.removeQueries({ queryKey: serverKeys.channels(server.id) });
            queryClient.invalidateQueries({ queryKey: serverKeys.all });
            onServerDeleted?.();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete server");
        } finally {
            setDeleting(false);
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: ReactNode }[] = [
        {
            id: "overview",
            label: "Overview",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            id: "roles",
            label: "Roles",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            id: "moderation",
            label: "Moderation",
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
        },
        {
            id: "danger",
            label: "Danger Zone",
            icon: (
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0f0f15] border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-[#0a0a0f] border-r border-white/5 p-3 shrink-0">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">
                        Settings
                    </h3>
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === tab.id
                                    ? "bg-white/10 text-zinc-100"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-zinc-100">
                            {tabs.find((t) => t.id === activeTab)?.label}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {activeTab === "overview" && (
                            <div className="space-y-6">
                                {/* Server Name */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Server Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="Enter server name..."
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                        placeholder="What's this server about?"
                                    />
                                </div>

                                {/* Visibility */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Server Visibility
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                checked={isPublic}
                                                onChange={() => setIsPublic(true)}
                                                className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-zinc-300">Public</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                checked={!isPublic}
                                                onChange={() => setIsPublic(false)}
                                                className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-zinc-300">Private</span>
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {isPublic
                                            ? "Anyone can find and join this server"
                                            : "Only people with an invite can join"}
                                    </p>
                                </div>

                                {/* Server Tag */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Server Tag
                                    </label>
                                    <input
                                        type="text"
                                        value={tag}
                                        onChange={(e) => setTag(e.target.value.slice(0, 9))}
                                        maxLength={9}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono uppercase tracking-wider"
                                        placeholder="ABC"
                                    />
                                    <p className="mt-1 text-xs text-zinc-500">
                                        1-9 karakter arası. Üye profillerinde [ {tag || "TAG"} ] şeklinde görünür.
                                    </p>
                                </div>

                                {/* Save Button */}
                                <div className="pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !name.trim()}
                                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
                                    >
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "roles" && (
                            <RolesList serverId={server.id} />
                        )}

                        {activeTab === "moderation" && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-zinc-300 mb-4">
                                        Server Bans
                                    </h3>
                                    <BansList serverId={server.id} />
                                </div>
                            </div>
                        )}

                        {activeTab === "danger" && (
                            <div className="space-y-6">
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <h3 className="text-lg font-medium text-red-400 mb-2">
                                        Delete Server
                                    </h3>
                                    <p className="text-sm text-zinc-400 mb-4">
                                        Once you delete a server, there is no going back. This action will permanently delete all channels, messages, and member data.
                                    </p>
                                    <div className="mb-4">
                                        <label className="block text-sm text-zinc-300 mb-2">
                                            Type <span className="font-mono text-red-400">{server.name}</span> to confirm
                                        </label>
                                        <input
                                            type="text"
                                            value={deleteConfirm}
                                            onChange={(e) => setDeleteConfirm(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-red-500/30 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                                            placeholder="Enter server name..."
                                        />
                                    </div>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting || deleteConfirm !== server.name}
                                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
                                    >
                                        {deleting ? "Deleting..." : "Delete Server"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
