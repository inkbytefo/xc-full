import { useRef, useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: "default" | "danger";
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    position: { x: number; y: number } | null;
    onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!position) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] w-48 bg-[#0a0a0f] border border-white/10 rounded-lg shadow-xl overflow-hidden py-1"
            style={{
                top: position.y,
                left: position.x,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${item.variant === "danger"
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-zinc-200 hover:bg-white/5"
                        }`}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
        </div>,
        document.body
    );
}

// Hook to manage context menu state
export function useContextMenu() {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [contextData, setContextData] = useState<any>(null);

    const handleContextMenu = (e: React.MouseEvent, data: any) => {
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setContextData(data);
    };

    const close = () => {
        setPosition(null);
        setContextData(null);
    };

    return { position, contextData, handleContextMenu, close };
}
