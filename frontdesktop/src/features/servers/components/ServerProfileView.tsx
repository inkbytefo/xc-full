import { useState } from "react";
import type { Server } from "../../../api/types";
import type { ServerMember } from "../hooks/useServerMembers";

type ServerProfileTab = "about" | "channels" | "wall";

interface ServerProfileViewProps {
    server: Server;
    members: ServerMember[];
    isOwner: boolean;
    isModerator?: boolean;
    onClose: () => void;
    onSettings?: () => void;
}

export function ServerProfileView({
    server,
    members,
    isOwner,
    isModerator = false,
    onClose,
    onSettings,
}: ServerProfileViewProps) {
    const [activeTab, setActiveTab] = useState<ServerProfileTab>("about");
    const onlineMembers = members.filter((m) => m.isOnline);
    const canManage = isOwner || isModerator;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Cover & Server Icon */}
            <div className="relative shrink-0">
                <div
                    className="h-32 sm:h-40"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#1a1a2e"}80, ${server.iconGradient?.[1] || "#16213e"}80)`,
                    }}
                />

                {/* Server Avatar */}
                <div className="absolute -bottom-12 left-6">
                    <div
                        className="w-24 h-24 rounded-2xl ring-4 ring-[#0a0a0f] shadow-2xl flex items-center justify-center text-white text-3xl font-bold"
                        style={{
                            backgroundImage: `linear-gradient(135deg, ${server.iconGradient?.[0] || "#333"}, ${server.iconGradient?.[1] || "#666"})`,
                        }}
                    >
                        {server.name?.[0]?.toUpperCase() || "?"}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-3 right-4 flex gap-2">
                    {canManage && onSettings && (
                        <button
                            onClick={onSettings}
                            className="px-4 py-2 rounded-full bg-[#050505]/60 backdrop-blur-md border border-white/20 text-zinc-100 font-medium hover:bg-[#050505]/80 transition-colors text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Sunucu Ayarları
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-[#050505]/60 backdrop-blur-md border border-white/20 text-zinc-100 hover:bg-[#050505]/80 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Server Info */}
            <div className="pt-16 px-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">{server.name}</h1>
                    {server.isPublic && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                            Public
                        </span>
                    )}
                </div>

                {server.description && (
                    <p className="mt-2 text-zinc-400 text-sm">{server.description}</p>
                )}

                {/* Stats Row */}
                <div className="flex gap-6 mt-4">
                    <div className="group">
                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {onlineMembers.length}
                        </span>{" "}
                        <span className="text-zinc-500">çevrimiçi</span>
                    </div>
                    <div className="group">
                        <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
                            {members.length}
                        </span>{" "}
                        <span className="text-zinc-500">üye</span>
                    </div>
                    <div>
                        <span className="font-bold text-white">
                            {new Date(server.createdAt || Date.now()).toLocaleDateString("tr-TR", {
                                month: "short",
                                year: "numeric",
                            })}
                        </span>{" "}
                        <span className="text-zinc-500">kuruldu</span>
                    </div>
                </div>

                {/* Owner Badge */}
                {isOwner && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                        </svg>
                        <span className="text-sm text-amber-300 font-medium">Bu sunucunun sahibisiniz</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mt-6 px-4">
                {(["about", "channels", "wall"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-center text-sm font-medium transition-all relative ${activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                    >
                        {tab === "about" ? "Hakkında" : tab === "channels" ? "Kanallar" : "Duvar"}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-purple-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {activeTab === "about" && (
                    <div className="space-y-6">
                        {/* Server Stats Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl bg-[#050505]/60 backdrop-blur-md border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">{members.length}</div>
                                <div className="text-xs text-zinc-500">Toplam Üye</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[#050505]/60 backdrop-blur-md border border-white/10">
                                <div className="text-2xl font-bold text-green-400 mb-1">{onlineMembers.length}</div>
                                <div className="text-xs text-zinc-500">Çevrimiçi</div>
                            </div>
                            <div className="p-4 rounded-xl bg-[#050505]/60 backdrop-blur-md border border-white/10">
                                <div className="text-2xl font-bold text-white mb-1">
                                    {new Date(server.createdAt || Date.now()).toLocaleDateString("tr-TR", {
                                        day: "numeric",
                                        month: "short",
                                    })}
                                </div>
                                <div className="text-xs text-zinc-500">Kuruluş</div>
                            </div>
                        </div>

                        {/* Top Members */}
                        <div>
                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                Öne Çıkan Üyeler
                            </h3>
                            <div className="space-y-2">
                                {members.slice(0, 5).map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        <div
                                            className="w-9 h-9 rounded-full shrink-0"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, ${member.avatarGradient?.[0] || "#333"}, ${member.avatarGradient?.[1] || "#666"})`,
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-zinc-200 truncate">{member.displayName}</div>
                                            <div className="text-xs text-zinc-500">@{member.handle}</div>
                                        </div>
                                        {member.role === "owner" && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                                                Sahip
                                            </span>
                                        )}
                                        {member.role === "admin" && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-400">
                                                Admin
                                            </span>
                                        )}
                                        {member.role === "moderator" && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                                Mod
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {members.length > 5 && (
                                    <div className="text-center py-2">
                                        <span className="text-xs text-zinc-500">+{members.length - 5} daha fazla üye</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "channels" && (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <span className="text-2xl">#</span>
                        </div>
                        <p className="font-medium">Kanal listesi</p>
                        <p className="text-sm mt-1 text-zinc-600">Sol menüden kanallara erişebilirsiniz</p>
                    </div>
                )}

                {activeTab === "wall" && (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <span className="text-2xl">📋</span>
                        </div>
                        <p className="font-medium">Sunucu duvarı</p>
                        <p className="text-sm mt-1 text-zinc-600">Yakında duyurular ve paylaşımlar burada görünecek</p>
                    </div>
                )}
            </div>
        </div>
    );
}
