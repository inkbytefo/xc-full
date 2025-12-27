import { useState, useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDownIcon } from "../Icons";
import { useChannelDnD } from "./useChannelDnD";
import { SortableChannelItem } from "./ChannelItem";
import { SortableVoiceChannelItem } from "./VoiceChannelItem";
import { DroppableCategoryHeader } from "./CategoryHeader";
import { getChannelIcon } from "./ChannelIcons";
import type { ChannelSidebarProps } from "./types";

export function ChannelSidebar({
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

    const {
        activeId,
        activeChannel,
        overId,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel
    } = useChannelDnD({
        categories,
        groupedChannels,
        voiceChannels,
        onReorderChannels
    });

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
    const uncategorizedVoice = useMemo(() =>
        uncategorizedChannels.filter(c =>
            c.type === "voice" || c.type === "video" || c.type === "stage"
        ),
        [uncategorizedChannels]
    );

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
