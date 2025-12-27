import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ServerMember } from "../hooks/useServerMembers";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ContextMenu, useContextMenu } from "./ContextMenu";
import { BanModal, TimeoutModal } from "./ActionModals";
import { removeTimeout } from "../serversApi";

import { RoleAssignmentModal } from "./RoleAssignmentModal";

interface MembersByRole {
    admin: ServerMember[];
    moderator: ServerMember[];
    online: ServerMember[];
    offline: ServerMember[];
}

interface MembersPanelProps {
    members: ServerMember[];
    membersByRole: MembersByRole;
    loading?: boolean;
    serverId?: string; // made optional to avoid breaking existing usage immediately
}

type FlatItem =
    | { type: "header"; title: string; count: number }
    | { type: "member"; member: ServerMember; showOnlineStatus?: boolean; isOffline?: boolean };

export function MembersPanel({ members, membersByRole, loading, serverId }: MembersPanelProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const { position, contextData, handleContextMenu, close } = useContextMenu();

    const [modal, setModal] = useState<{ type: "ban" | "timeout" | "roles"; member: ServerMember } | null>(null);

    const flatItems = useMemo(() => {
        const items: FlatItem[] = [];

        if (membersByRole.admin.length > 0) {
            items.push({ type: "header", title: "Admin", count: membersByRole.admin.length });
            items.push(...membersByRole.admin.map(m => ({ type: "member" as const, member: m })));
        }

        if (membersByRole.moderator.length > 0) {
            items.push({ type: "header", title: "Moderators", count: membersByRole.moderator.length });
            items.push(...membersByRole.moderator.map(m => ({ type: "member" as const, member: m })));
        }

        if (membersByRole.online.length > 0) {
            items.push({ type: "header", title: "Online", count: membersByRole.online.length });
            items.push(...membersByRole.online.map(m => ({
                type: "member" as const,
                member: m,
                showOnlineStatus: true
            })));
        }

        if (membersByRole.offline.length > 0) {
            items.push({ type: "header", title: "Offline", count: membersByRole.offline.length });
            items.push(...membersByRole.offline.map(m => ({
                type: "member" as const,
                member: m,
                isOffline: true
            })));
        }

        return items;
    }, [membersByRole]);

    const virtualizer = useVirtualizer({
        count: flatItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            return flatItems[index].type === "header" ? 32 : 44; // Header: 32px, Member: 44px
        },
        overscan: 10,
    });

    if (loading) {
        return (
            <div className="w-60 bg-[#0a0a0f]/80 backdrop-blur-md border-l border-white/5 flex flex-col h-full">
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-6" />
                    </div>
                </div>
                <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={`g-${i}`}>
                            <div className="px-2 py-3">
                                <Skeleton className="h-3 w-16 opacity-50" />
                            </div>
                            {Array.from({ length: 3 }).map((__, j) => (
                                <div key={j} className="flex items-center gap-2 px-2 py-1.5 opacity-50">
                                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-2 w-16 bg-white/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-60 bg-[#0a0a0f]/80 backdrop-blur-md border-l border-white/5 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Server Members
                    </span>
                    <span className="text-xs text-zinc-500">{members.length}</span>
                </div>
            </div>

            {/* Members List */}
            <div
                ref={parentRef}
                className="flex-1 overflow-y-auto p-2"
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                        const item = flatItems[virtualItem.index];
                        return (
                            <div
                                key={virtualItem.key}
                                data-index={virtualItem.index}
                                ref={virtualizer.measureElement}
                                className="absolute top-0 left-0 w-full"
                                style={{
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                            >
                                {item.type === "header" ? (
                                    <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase h-8 flex items-center">
                                        {item.title} — {item.count}
                                    </div>
                                ) : (
                                    <div onContextMenu={(e) => handleContextMenu(e, item.member)}>
                                        <MemberItem
                                            member={item.member}
                                            showOnlineStatus={item.showOnlineStatus}
                                            isOffline={item.isOffline}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Context Menu */}
            <ContextMenu
                position={position}
                onClose={close}
                items={[
                    {
                        label: "Manage Roles",
                        onClick: () => setModal({ type: "roles", member: contextData }),
                        icon: (
                            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        )
                    },
                    {
                        label: "Timeout",
                        onClick: () => setModal({ type: "timeout", member: contextData }),
                        icon: (
                            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )
                    },
                    {
                        label: "Remove Timeout",
                        onClick: async () => {
                            if (serverId && contextData) {
                                await removeTimeout(serverId, contextData.userId);
                                // Ideally trigger a refresh or toast here
                            }
                        },
                        icon: (
                            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )
                    },
                    {
                        label: "Ban Member",
                        onClick: () => setModal({ type: "ban", member: contextData }),
                        variant: "danger",
                        icon: (
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        )
                    },
                ]}
            />

            {modal && serverId && (
                <>
                    <BanModal
                        isOpen={modal.type === "ban"}
                        onClose={() => setModal(null)}
                        serverId={serverId}
                        userId={modal.member.userId}
                        userName={modal.member.displayName || modal.member.user?.displayName || "Unknown"}
                    />
                    <TimeoutModal
                        isOpen={modal.type === "timeout"}
                        onClose={() => setModal(null)}
                        serverId={serverId}
                        userId={modal.member.userId}
                        userName={modal.member.displayName || modal.member.user?.displayName || "Unknown"}
                    />
                    <RoleAssignmentModal
                        isOpen={modal.type === "roles"}
                        onClose={() => setModal(null)}
                        serverId={serverId}
                        userId={modal.member.userId}
                        userName={modal.member.displayName || modal.member.user?.displayName || "Unknown"}
                        initialRoleIds={modal.member.roleIds}
                    />
                </>
            )}
        </div>
    );
}

interface MemberItemProps {
    member: ServerMember;
    showOnlineStatus?: boolean;
    isOffline?: boolean;
}

function MemberItem({ member, showOnlineStatus, isOffline }: MemberItemProps) {
    return (
        <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer select-none ${isOffline ? "opacity-50" : ""
                }`}
        >
            <div className="relative">
                <div
                    className="w-8 h-8 rounded-full"
                    style={{
                        backgroundImage: `linear-gradient(135deg, ${member.avatarGradient?.[0] || "#333"}, ${member.avatarGradient?.[1] || "#666"})`,
                    }}
                />
                <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0f] ${showOnlineStatus ? "bg-green-500" : isOffline ? "bg-zinc-500" : member.isOnline ? "bg-green-500" : "bg-zinc-500"
                        }`}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-200 truncate">{member.displayName}</div>
                {member.role !== "member" && (
                    <div className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded inline-block mt-0.5 uppercase font-bold tracking-wider">
                        {member.role}
                    </div>
                )}
            </div>
        </div>
    );
}
