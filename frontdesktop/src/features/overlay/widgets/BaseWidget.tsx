import { ReactNode, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useWidgetStore } from '../stores/widgetStore';
import { useOverlaySettings } from '../stores/overlaySettingsStore';
import { useOverlayMode } from '../hooks/useOverlayMode';

interface BaseWidgetProps {
    id: string; // Unique ID for the store
    title: string;
    icon: string;
    children: ReactNode;
    defaultPosition?: { x: number; y: number };
    defaultSize?: { width: number; height: number };
    headerActions?: ReactNode;
    compact?: boolean;
    pinnable?: boolean; // Default: true. If false, pin button is hidden
}

export function BaseWidget({
    id,
    title,
    icon,
    children,
    defaultPosition = { x: 100, y: 100 },
    defaultSize = { width: 300, height: 400 },
    headerActions,
    compact: compactOverride,
    pinnable = true
}: BaseWidgetProps) {
    const { pinnedView } = useOverlayMode();
    const { compactMode, widgetAnimations, pinnedWidgetOpacity } = useOverlaySettings();
    const {
        registerWidget,
        widgets,
        updatePosition,
        updateSize,
        bringToFront,
        closeWidget,
        togglePin
    } = useWidgetStore();

    const snapToEdges = (
        nextPos: { x: number; y: number },
        currentSize: { width: number; height: number }
    ) => {
        const margin = 16;
        const threshold = 24;
        const maxX = Math.max(margin, window.innerWidth - currentSize.width - margin);
        const maxY = Math.max(margin, window.innerHeight - currentSize.height - margin);

        const clamped = {
            x: Math.min(Math.max(nextPos.x, margin), maxX),
            y: Math.min(Math.max(nextPos.y, margin), maxY)
        };

        const left = clamped.x;
        const right = window.innerWidth - (clamped.x + currentSize.width);
        const top = clamped.y;
        const bottom = window.innerHeight - (clamped.y + currentSize.height);

        let snappedX = clamped.x;
        let snappedY = clamped.y;

        if (left <= threshold) snappedX = margin;
        else if (right <= threshold) snappedX = window.innerWidth - currentSize.width - margin;

        if (top <= threshold) snappedY = margin;
        else if (bottom <= threshold) snappedY = window.innerHeight - currentSize.height - margin;

        return { x: snappedX, y: snappedY };
    };

    // Register widget on mount if not exists
    useEffect(() => {
        registerWidget(id, defaultPosition, defaultSize);
    }, [id, defaultPosition, defaultSize, registerWidget]);

    const widgetState = widgets[id];

    // If not registered yet, or closed, don't render (unless we want to support "closed but in logic", usually we stop rendering)
    if (!widgetState || !widgetState.isOpen) return null;

    if (pinnedView && !widgetState.isPinned) return null;

    const isCompact = compactOverride ?? compactMode;
    const { position, size, zIndex, isPinned } = widgetState;

    // Ripple effect
    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!widgetAnimations) return;
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        const sizeDim = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${sizeDim}px`;
        ripple.style.left = `${e.clientX - rect.left - sizeDim / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - sizeDim / 2}px`;
        ripple.className = 'ripple';
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    };

    return (
        <Rnd
            position={position}
            size={size}
            onDragStop={(_e, d) => {
                const nextPos = { x: d.x, y: d.y };
                updatePosition(id, isPinned ? snapToEdges(nextPos, size) : nextPos);
            }}
            onResizeStop={(_e, _direction, ref, _delta, position) => {
                const nextSize = {
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height)
                };
                updateSize(id, nextSize);
                updatePosition(id, isPinned ? snapToEdges(position, nextSize) : position);
            }}
            onMouseDown={() => bringToFront(id)}
            dragHandleClassName="widget-drag-handle"
            bounds="window"
            style={{ zIndex }}
            className={`widget-wrapper ${isPinned && pinnedView ? 'ghost-pinned' : ''}`}
            enableResizing={!pinnedView}
            disableDragging={pinnedView}
        >
            <div
                className={`widget ${isCompact ? 'compact' : ''}`}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    ...(pinnedView && isPinned ? {
                        background: 'rgba(0,0,0,var(--pinned-widget-bg-opacity, 0))',
                        boxShadow: 'none',
                        backdropFilter: pinnedWidgetOpacity > 0 ? 'blur(4px)' : 'none',
                        border: pinnedWidgetOpacity > 0.02 ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'
                    } : {})
                }}
            >
                {/* Header */}
                <div
                    className="widget-header widget-drag-handle"
                    style={{
                        cursor: pinnedView ? 'default' : 'grab',
                        opacity: pinnedView ? 0 : 1,
                        pointerEvents: pinnedView ? 'none' : 'auto',
                        height: pinnedView ? 0 : 52,
                        minHeight: pinnedView ? 0 : 52,
                        padding: pinnedView ? 0 : undefined,
                        overflow: 'hidden'
                    }}
                >
                    <div className="widget-title">
                        <span style={{ fontSize: isCompact ? 14 : 16 }}>{icon}</span>
                        <span>{title}</span>
                    </div>

                    <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                        {headerActions}

                        {/* Pin Button - Only show if pinnable */}
                        {pinnable && (
                            <button
                                onClick={(e) => {
                                    handleRipple(e);
                                    const nextPinned = !isPinned;
                                    togglePin(id);
                                    if (nextPinned) {
                                        updatePosition(id, snapToEdges(position, size));
                                    }
                                }}
                                className={`pin-btn ${isPinned ? 'pinned' : ''}`}
                                title={isPinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 2v2M8 2v2M12 2v20M2 12h20" />
                                    {/* Simple pin icon representation or rotation */}
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" opacity={isPinned ? 1 : 0.5} />
                                </svg>
                            </button>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={(e) => {
                                handleRipple(e);
                                closeWidget(id);
                            }}
                            className="pin-btn hover:bg-red-500/20 hover:text-red-400"
                            title="Kapat"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="widget-content" style={{ flex: 1, overflow: 'auto' }}>
                    {children}
                </div>
            </div>
        </Rnd>
    );
}
