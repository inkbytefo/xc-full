// ============================================================================
// usePiPDrag Hook - Draggable Picture-in-Picture functionality
// ============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { useMediaSessionStore } from "../../../store/mediaSessionStore";

interface Position {
    x: number;
    y: number;
}

interface UsePiPDragOptions {
    /** Minimum distance from screen edges */
    padding?: number;
    /** Enable snap to edges */
    snapToEdges?: boolean;
    /** Snap threshold in pixels */
    snapThreshold?: number;
}

interface UsePiPDragResult {
    /** Current position */
    position: Position;
    /** Whether currently dragging */
    isDragging: boolean;
    /** Props to spread on the draggable element */
    dragProps: {
        onMouseDown: (e: React.MouseEvent) => void;
        onTouchStart: (e: React.TouchEvent) => void;
        style: React.CSSProperties;
    };
}

/**
 * Hook for making the PiP container draggable
 */
export function usePiPDrag(options: UsePiPDragOptions = {}): UsePiPDragResult {
    const { padding = 20, snapToEdges = true, snapThreshold = 30 } = options;

    const storedPosition = useMediaSessionStore((s) => s.pip.position);
    const storedSize = useMediaSessionStore((s) => s.pip.size);
    const updatePiPPosition = useMediaSessionStore((s) => s.updatePiPPosition);

    const [position, setPosition] = useState<Position>(storedPosition);
    const [isDragging, setIsDragging] = useState(false);

    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const initialPosRef = useRef<Position>(position);

    // Sync with store
    useEffect(() => {
        if (!isDragging) {
            setPosition(storedPosition);
        }
    }, [storedPosition, isDragging]);

    // Clamp position to screen bounds
    const clampPosition = useCallback(
        (pos: Position): Position => {
            const maxX = window.innerWidth - storedSize.width - padding;
            const maxY = window.innerHeight - storedSize.height - padding;

            let x = Math.max(padding, Math.min(pos.x, maxX));
            let y = Math.max(padding, Math.min(pos.y, maxY));

            // Snap to edges if enabled
            if (snapToEdges) {
                // Snap to left edge
                if (x < padding + snapThreshold) {
                    x = padding;
                }
                // Snap to right edge
                if (x > maxX - snapThreshold) {
                    x = maxX;
                }
                // Snap to top edge
                if (y < padding + snapThreshold) {
                    y = padding;
                }
                // Snap to bottom edge
                if (y > maxY - snapThreshold) {
                    y = maxY;
                }
            }

            return { x, y };
        },
        [storedSize, padding, snapToEdges, snapThreshold]
    );

    // Handle drag move
    const handleMove = useCallback(
        (clientX: number, clientY: number) => {
            if (!dragStartRef.current) return;

            const deltaX = clientX - dragStartRef.current.x;
            const deltaY = clientY - dragStartRef.current.y;

            const newPos = clampPosition({
                x: initialPosRef.current.x + deltaX,
                y: initialPosRef.current.y + deltaY,
            });

            setPosition(newPos);
        },
        [clampPosition]
    );

    // Handle drag end
    const handleEnd = useCallback(() => {
        if (dragStartRef.current) {
            // Save final position to store
            updatePiPPosition(position.x, position.y);
        }

        dragStartRef.current = null;
        setIsDragging(false);
    }, [position, updatePiPPosition]);

    // Mouse event handlers
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            handleMove(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            handleEnd();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, handleMove, handleEnd]);

    // Touch event handlers
    useEffect(() => {
        if (!isDragging) return;

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        };

        const handleTouchEnd = () => {
            handleEnd();
        };

        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isDragging, handleMove, handleEnd]);

    // Start drag handlers
    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            // Only left click
            if (e.button !== 0) return;

            e.preventDefault();
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            initialPosRef.current = position;
            setIsDragging(true);
        },
        [position]
    );

    const onTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length !== 1) return;

            dragStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
            initialPosRef.current = position;
            setIsDragging(true);
        },
        [position]
    );

    return {
        position,
        isDragging,
        dragProps: {
            onMouseDown,
            onTouchStart,
            style: {
                position: "fixed",
                left: position.x,
                top: position.y,
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                zIndex: 9999,
            },
        },
    };
}
