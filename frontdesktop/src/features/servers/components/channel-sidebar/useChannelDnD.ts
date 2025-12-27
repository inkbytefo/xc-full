import { useState, useMemo, useCallback } from "react";
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Channel } from "../../../../api/types";

interface UseChannelDnDProps {
    categories: Channel[];
    groupedChannels: Map<string | null, Channel[]>;
    voiceChannels: Channel[];
    onReorderChannels?: (updates: Array<{ id: string; position: number; parentId?: string | null }>) => Promise<void>;
}

export function useChannelDnD({
    categories,
    groupedChannels,
    voiceChannels,
    onReorderChannels,
}: UseChannelDnDProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    // Flatten all channels for drag context lookup
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
        const overIdStr = String(over.id);
        const isDropOnCategory = overIdStr.startsWith('drop-');
        const actualOverId = isDropOnCategory ? overIdStr.replace('drop-', '') : overIdStr;

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

    return {
        activeId,
        activeChannel,
        overId,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel
    };
}
