import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ServerMember } from "../hooks/useServerMembers";
import { Skeleton } from "../../../components/ui/Skeleton";

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
}

type FlatItem =
    | { type: "header"; title: string; count: number }
    | { type: "member"; member: ServerMember; showOnlineStatus?: boolean; isOffline?: boolean };

export function MembersPanel({ members, membersByRole, loading }: MembersPanelProps) {
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

    const parentRef = useRef<HTMLDivElement>(null);

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
                                    <MemberItem
                                        member={item.member}
                                        showOnlineStatus={item.showOnlineStatus}
                                        isOffline={item.isOffline}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Keeping MemberItem component as is, removing wrapping MemberGroup since we flattened it
interface MemberItemProps {
    member: ServerMember;
    showOnlineStatus?: boolean;
    isOffline?: boolean;
}

function MemberItem({ member, showOnlineStatus, isOffline }: MemberItemProps) {
    return (
        <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 ${isOffline ? "opacity-50" : ""
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
                {member.status && <div className="text-xs text-zinc-500 truncate">{member.status}</div>}
            </div>
        </div>
    );
}
