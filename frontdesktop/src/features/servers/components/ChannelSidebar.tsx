// ============================================================================
// ChannelSidebar - Dynamic Category-Based Channel List with Drag & Drop
// ============================================================================

import { useState, useMemo, useCallback } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Channel } from "../../../api/types";
import { HashIcon, ChevronDownIcon, VolumeIcon, VideoIcon, StageIcon } from "./Icons";

// ============================================================================
// Local Icons
// ============================================================================

function MegaphoneIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
        </svg>
    );
}

function HybridIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
            <circle cx="18" cy="6" r="3" strokeWidth={2} />
        </svg>
    );
}

function DragHandleIcon() {
    return (
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
        </svg>
    );
}

function getChannelIcon(type: string, className: string = "w-4 h-4 opacity-70 shrink-0") {
    switch (type) {
        case "announcement":
            return <MegaphoneIcon className={`${className} text-yellow-500/80`} />;
        case "voice":
            return <VolumeIcon className={className} />;
        case "video":
            return <VideoIcon className={className} />;
        case "stage":
            return <StageIcon className={className} />;
        case "hybrid":
            return <HybridIcon className={`${className} text-purple-400/80`} />;
        case "text":
        default:
            return <HashIcon className={className} />;
    }
}

// ============================================================================
// Types
// ============================================================================

interface VoiceParticipant {
    sid: string;
    identity: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isLocal: boolean;
}

interface ChannelParticipant {
    oderId: string;
    odername: string;
    avatarGradient?: [string, string];
    isSpeaking?: boolean;
    isMuted?: boolean;
}

interface ChannelSidebarProps {
    // Server ID for API calls
    serverId: string;

    // Channel data
    categories: Channel[];
    groupedChannels: Map<string | null, Channel[]>;
    voiceChannels: Channel[];

    // Selection state
    selectedChannel: string | null;
    activeVoiceChannelId: string | null;
    isVoiceConnected: boolean;
    isVoiceConnecting: boolean;

    // Participants
    voiceParticipants: VoiceParticipant[];
    channelParticipants?: Map<string, ChannelParticipant[]>;

    // UI state
    channelsLoading: boolean;
    canManageChannels?: boolean;

    // Callbacks
    onSelectChannel: (channelId: string) => void;
    onVoiceChannelClick: (channelId: string) => void;
    onAddChannel?: () => void;
    onEditChannel?: (channel: Channel) => void;
    onDeleteChannel?: (channel: Channel) => void;
    onReorderChannels?: (updates: Array<{ id: string; position: number; parentId?: string | null }>) => Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ChannelSidebar({
    serverId: _serverId, // Reserved for future use
    categories,
    groupedChannels,
    voiceChannels,
    selectedChannel,
    activeVoiceChannelId,
    isVoiceConnected,
    isVoiceConnecting,
    voiceParticipants,
    channelParticipants = new Map(),
    channelsLoading,
    canManageChannels = false,
    onSelectChannel,
    onVoiceChannelClick,
    onAddChannel,
    onEditChannel,
    onDeleteChannel,
    onReorderChannels,
}: ChannelSidebarProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    // Flatten all channels for drag context
    const allChannels = useMemo(() => {
        const result: Channel[] = [];
        // Add uncategorized first
        const uncategorized = groupedChannels.get(null) || [];
        result.push(...uncategorized);
        // Add categorized
        categories.forEach(cat => {
            result.push(cat); // category itself
            const children = groupedChannels.get(cat.id) || [];
            result.push(...children);
        });
        // Add voice channels from old API
        result.push(...voiceChannels.filter(v => !result.some(r => r.id === v.id)));
        return result;
    }, [categories, groupedChannels, voiceChannels]);

    const activeChannel = useMemo(() =>
        allChannels.find(c => c.id === activeId),
        [allChannels, activeId]
    );

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const toggleCategory = (categoryId: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    // Get uncategorized channels (text and hybrid - both show chat)
    const uncategorizedChannels = useMemo(() => {
        return groupedChannels.get(null) || [];
    }, [groupedChannels]);

    // All non-category channels are displayed as text channels now (text + announcement + hybrid)
    const uncategorizedText = useMemo(() =>
        uncategorizedChannels.filter(c => c.type === "text" || c.type === "announcement" || c.type === "hybrid"),
        [uncategorizedChannels]
    );

    // Legacy voice channels from old API - kept for backward compatibility
    // These will be empty since we no longer have voice/video/stage types
    const uncategorizedVoice = useMemo(() =>
        uncategorizedChannels.filter(c =>
            c.type === "voice" || c.type === "video" || c.type === "stage"
        ),
        [uncategorizedChannels]
    );

    // DnD handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        setOverId(event.over?.id as string | null);
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setOverId(null);

        if (!over || active.id === over.id || !onReorderChannels) return;

        const activeChannel = allChannels.find(c => c.id === active.id);

        // Handle drop- prefixed IDs for droppable category targets
        const overId = String(over.id);
        const isDropOnCategory = overId.startsWith('drop-');
        const actualOverId = isDropOnCategory ? overId.replace('drop-', '') : overId;

        const overChannel = allChannels.find(c => c.id === actualOverId);

        if (!activeChannel) return;

        // Don't allow dropping categories into themselves
        if (activeChannel.type === 'category' && isDropOnCategory && actualOverId === activeChannel.id) {
            return;
        }

        // Determine new position and parent
        let newParentId: string | null = null;
        let newPosition = 0;

        if (isDropOnCategory) {
            // Dropping on a category droppable - move channel into that category
            newParentId = actualOverId;
            const categoryChildren = groupedChannels.get(actualOverId) || [];
            newPosition = categoryChildren.length;
        } else if (overChannel) {
            // Dropping on a channel or category (sortable)
            if (overChannel.type === "category") {
                // Reordering categories - keep null parent, just change position
                if (activeChannel.type === "category") {
                    newParentId = null;
                    newPosition = overChannel.position;
                } else {
                    // Channel dropped on category sortable area - move into category
                    newParentId = overChannel.id;
                    const categoryChildren = groupedChannels.get(overChannel.id) || [];
                    newPosition = categoryChildren.length;
                }
            } else {
                // Dropping on a regular channel - take its position
                newParentId = overChannel.parentId || null;
                newPosition = overChannel.position;
            }
        }

        // Build updates array
        const updates: Array<{ id: string; position: number; parentId?: string | null }> = [];

        // Get siblings in target category
        const siblings = [...(groupedChannels.get(newParentId) || [])].filter(c => c.id !== activeChannel.id);

        // Insert active channel at new position
        siblings.splice(newPosition, 0, activeChannel);

        // Update positions for all siblings
        siblings.forEach((ch, idx) => {
            if (ch.id === activeChannel.id) {
                updates.push({
                    id: ch.id,
                    position: idx,
                    parentId: newParentId,
                });
            } else if (ch.position !== idx) {
                updates.push({
                    id: ch.id,
                    position: idx,
                });
            }
        });

        if (updates.length > 0) {
            try {
                await onReorderChannels(updates);
            } catch (error) {
                console.error("Failed to reorder channels:", error);
            }
        }
    }, [allChannels, groupedChannels, onReorderChannels]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setOverId(null);
    }, []);

    if (channelsLoading) {
        return (
            <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            </div>
        );
    }

    const isDragEnabled = canManageChannels && !!onReorderChannels;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="flex-1 overflow-y-auto p-2">
                {/* Uncategorized Text Channels */}
                {uncategorizedText.length > 0 && (
                    <SortableContext
                        items={uncategorizedText.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="mb-2">
                            {uncategorizedText.map(channel => (
                                <SortableChannelItem
                                    key={channel.id}
                                    channel={channel}
                                    isSelected={selectedChannel === channel.id}
                                    isDragEnabled={isDragEnabled}
                                    isOver={overId === channel.id}
                                    canManage={canManageChannels}
                                    onClick={() => onSelectChannel(channel.id)}
                                    onEdit={() => onEditChannel?.(channel)}
                                    onDelete={() => onDeleteChannel?.(channel)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}

                {/* Uncategorized Voice Channels (from unified API) */}
                {uncategorizedVoice.length > 0 && (
                    <SortableContext
                        items={uncategorizedVoice.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="mb-2">
                            {uncategorizedVoice.map(channel => {
                                const isActive = activeVoiceChannelId === channel.id && isVoiceConnected;
                                const isConnecting = activeVoiceChannelId === channel.id && isVoiceConnecting;
                                const participants = isActive ? voiceParticipants : (channelParticipants.get(channel.id) || []);

                                return (
                                    <SortableVoiceChannelItem
                                        key={channel.id}
                                        channel={channel}
                                        isActive={isActive}
                                        isConnecting={isConnecting}
                                        isDragEnabled={isDragEnabled}
                                        isOver={overId === channel.id}
                                        participants={participants}
                                        canManage={canManageChannels}
                                        onClick={() => onVoiceChannelClick(channel.id)}
                                        onEdit={() => onEditChannel?.(channel)}
                                        onDelete={() => onDeleteChannel?.(channel)}
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                )}

                {/* Dynamic Categories */}
                {categories.map(category => {
                    const categoryChannels = groupedChannels.get(category.id) || [];
                    const isCollapsed = collapsedCategories.has(category.id);

                    const textInCategory = categoryChannels.filter(c =>
                        c.type === "text" || c.type === "announcement" || c.type === "hybrid"
                    );
                    const voiceInCategory = categoryChannels.filter(c =>
                        c.type === "voice" || c.type === "video" || c.type === "stage"
                    );

                    // Show category even if empty (allows adding channels to it)
                    return (
                        <div key={category.id} className="mb-2">
                            {/* Category Header - Droppable & Sortable */}
                            <DroppableCategoryHeader
                                category={category}
                                isCollapsed={isCollapsed}
                                canManageChannels={canManageChannels}
                                isDragEnabled={isDragEnabled}
                                onToggle={() => toggleCategory(category.id)}
                                onAddChannel={onAddChannel}
                                onEdit={() => onEditChannel?.(category)}
                                onDelete={() => onDeleteChannel?.(category)}
                            />

                            {/* Category Channels */}
                            {!isCollapsed && (
                                <SortableContext
                                    items={categoryChannels.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {textInCategory.map(channel => (
                                        <SortableChannelItem
                                            key={channel.id}
                                            channel={channel}
                                            isSelected={selectedChannel === channel.id}
                                            isDragEnabled={isDragEnabled}
                                            isOver={overId === channel.id}
                                            canManage={canManageChannels}
                                            onClick={() => onSelectChannel(channel.id)}
                                            onEdit={() => onEditChannel?.(channel)}
                                            onDelete={() => onDeleteChannel?.(channel)}
                                        />
                                    ))}

                                    {voiceInCategory.map(channel => {
                                        const isActive = activeVoiceChannelId === channel.id && isVoiceConnected;
                                        const isConnecting = activeVoiceChannelId === channel.id && isVoiceConnecting;
                                        const participants = isActive ? voiceParticipants : (channelParticipants.get(channel.id) || []);

                                        return (
                                            <SortableVoiceChannelItem
                                                key={channel.id}
                                                channel={channel}
                                                isActive={isActive}
                                                isConnecting={isConnecting}
                                                isDragEnabled={isDragEnabled}
                                                isOver={overId === channel.id}
                                                participants={participants}
                                                canManage={canManageChannels}
                                                onClick={() => onVoiceChannelClick(channel.id)}
                                                onEdit={() => onEditChannel?.(channel)}
                                                onDelete={() => onDeleteChannel?.(channel)}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            )}
                        </div>
                    );
                })}

                {/* Voice Channels (fallback for old API) */}
                {voiceChannels.length > 0 && categories.length === 0 && (
                    <SortableContext
                        items={voiceChannels.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="mb-2">
                            <div className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                <ChevronDownIcon className="w-3 h-3" />
                                Voice Rooms
                            </div>
                            {voiceChannels.map(channel => {
                                const isActive = activeVoiceChannelId === channel.id && isVoiceConnected;
                                const isConnecting = activeVoiceChannelId === channel.id && isVoiceConnecting;
                                const participants = isActive ? voiceParticipants : (channelParticipants.get(channel.id) || []);

                                return (
                                    <SortableVoiceChannelItem
                                        key={channel.id}
                                        channel={channel}
                                        isActive={isActive}
                                        isConnecting={isConnecting}
                                        isDragEnabled={isDragEnabled}
                                        isOver={overId === channel.id}
                                        participants={participants}
                                        canManage={canManageChannels}
                                        onClick={() => onVoiceChannelClick(channel.id)}
                                        onEdit={() => onEditChannel?.(channel)}
                                        onDelete={() => onDeleteChannel?.(channel)}
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                )}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeId && activeChannel && (
                    <div className="bg-[#1a1a22] border border-purple-500/50 rounded-md shadow-lg px-2 py-1.5 flex items-center gap-2 text-sm text-zinc-200">
                        {getChannelIcon(activeChannel.type)}
                        <span>{activeChannel.name}</span>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}

// ============================================================================
// Droppable Category Header
// ============================================================================

interface DroppableCategoryHeaderProps {
    category: Channel;
    isCollapsed: boolean;
    canManageChannels: boolean;
    isDragEnabled: boolean;
    onToggle: () => void;
    onAddChannel?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

function DroppableCategoryHeader({
    category,
    isCollapsed,
    canManageChannels,
    isDragEnabled,
    onToggle,
    onAddChannel,
    onEdit,
    onDelete,
}: DroppableCategoryHeaderProps) {
    // Both droppable (for channels) and sortable (for category reordering)
    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `drop-${category.id}`,
        data: { type: 'category', categoryId: category.id }
    });

    const {
        attributes,
        listeners,
        setNodeRef: setSortRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: category.id,
        disabled: !isDragEnabled,
        data: { type: 'category' }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Combine refs
    const setNodeRef = (node: HTMLElement | null) => {
        setDropRef(node);
        setSortRef(node);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group/category flex items-center gap-1 px-1 py-1 rounded transition-colors ${isOver ? "bg-purple-500/20 ring-1 ring-purple-500/50" : ""
                }`}
        >
            {/* Drag Handle for Category */}
            {isDragEnabled && (
                <div
                    {...attributes}
                    {...listeners}
                    className="opacity-0 group-hover/category:opacity-100 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 -ml-0.5 mr-0.5"
                >
                    <svg width="8" height="12" viewBox="0 0 10 16" fill="currentColor">
                        <circle cx="2" cy="2" r="1.5" />
                        <circle cx="8" cy="2" r="1.5" />
                        <circle cx="2" cy="8" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                    </svg>
                </div>
            )}

            <button
                onClick={onToggle}
                className="flex-1 flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
            >
                <ChevronDownIcon
                    className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                />
                {category.name}
            </button>

            {canManageChannels && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover/category:opacity-100 transition-opacity">
                    {onAddChannel && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChannel(); }}
                            className="p-0.5 rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-400"
                            title="Kanal Ekle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-0.5 rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-400"
                            title="Düzenle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-0.5 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400"
                            title="Sil"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Sortable Channel Item
// ============================================================================

interface SortableChannelItemProps {
    channel: Channel;
    isSelected: boolean;
    isDragEnabled: boolean;
    isOver: boolean;
    canManage?: boolean;
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

function SortableChannelItem({
    channel,
    isSelected,
    isDragEnabled,
    isOver,
    canManage,
    onClick,
    onEdit,
    onDelete,
}: SortableChannelItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: channel.id,
        disabled: !isDragEnabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group/channel ${isOver ? "before:absolute before:left-0 before:right-0 before:-top-0.5 before:h-0.5 before:bg-purple-500 before:rounded" : ""}`}
        >
            <div
                className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${isSelected
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
            >
                {/* Drag Handle */}
                {isDragEnabled && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="opacity-0 group-hover/channel:opacity-100 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 -ml-1"
                    >
                        <DragHandleIcon />
                    </div>
                )}

                <button onClick={onClick} className="flex-1 flex items-center gap-2 text-left">
                    {getChannelIcon(channel.type)}
                    <span className="truncate text-sm">{channel.name}</span>
                </button>

                {canManage && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/channel:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                            title="Düzenle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                            title="Sil"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Sortable Voice Channel Item
// ============================================================================

interface SortableVoiceChannelItemProps {
    channel: Channel;
    isActive: boolean;
    isConnecting: boolean;
    isDragEnabled: boolean;
    isOver: boolean;
    participants: Array<VoiceParticipant | ChannelParticipant>;
    canManage?: boolean;
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

function SortableVoiceChannelItem({
    channel,
    isActive,
    isConnecting,
    isDragEnabled,
    isOver,
    participants,
    canManage,
    onClick,
    onEdit,
    onDelete,
}: SortableVoiceChannelItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: channel.id,
        disabled: !isDragEnabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group/channel ${isOver ? "before:absolute before:left-0 before:right-0 before:-top-0.5 before:h-0.5 before:bg-purple-500 before:rounded" : ""}`}
        >
            {/* Channel Button */}
            <div
                className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${isActive
                    ? "bg-green-500/20 text-green-400"
                    : isConnecting
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
            >
                {/* Drag Handle */}
                {isDragEnabled && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="opacity-0 group-hover/channel:opacity-100 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 -ml-1"
                    >
                        <DragHandleIcon />
                    </div>
                )}

                <button onClick={onClick} className="flex-1 flex items-center gap-2 text-left">
                    {getChannelIcon(channel.type)}
                    <span className="truncate text-sm flex-1">{channel.name}</span>
                    {isConnecting && (
                        <div className="h-3 w-3 animate-spin rounded-full border border-yellow-400 border-t-transparent" />
                    )}
                    {(channel.participantCount ?? 0) > 0 && !isActive && (
                        <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
                            {channel.participantCount}
                        </span>
                    )}
                </button>

                {canManage && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/channel:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                            title="Düzenle"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                            title="Sil"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
                <div className="ml-6 mt-1 space-y-0.5">
                    {participants.map((p, idx) => {
                        const identity = 'identity' in p ? p.identity : p.odername;
                        const isSpeaking = 'isSpeaking' in p ? p.isSpeaking : false;
                        const isMuted = 'isMuted' in p ? p.isMuted : false;
                        const isLocal = 'isLocal' in p ? p.isLocal : false;
                        const uniqueKey = 'sid' in p ? p.sid : `${p.oderId}-${idx}`;

                        return (
                            <div
                                key={uniqueKey}
                                className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-white/5"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full shrink-0 ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-zinc-600"
                                        }`}
                                />
                                <span className={`truncate ${isMuted ? "text-zinc-500" : "text-zinc-300"}`}>
                                    {identity}
                                    {isLocal && <span className="text-zinc-500 ml-1">(Sen)</span>}
                                </span>
                                {isMuted && (
                                    <svg className="w-3 h-3 text-red-400 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
