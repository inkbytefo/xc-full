import React from "react";

interface ControlButtonProps {
    onClick: () => void;
    icon: React.ElementType;
    activeIcon?: React.ElementType;
    isActive?: boolean;
    danger?: boolean;
    label?: string;
    className?: string;
}

export function ControlButton({
    onClick,
    icon: Icon,
    activeIcon: ActiveIcon,
    isActive = false,
    danger = false,
    label,
    className = ""
}: ControlButtonProps) {
    const ActualIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

    return (
        <button
            onClick={onClick}
            className={`group relative p-3 rounded-full transition-all duration-300 ${isActive
                ? danger
                    ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                    : "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-white/5"
                } ${className}`}
            title={label}
        >
            <ActualIcon className="w-6 h-6" />

            {label && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/5">
                    {label}
                </div>
            )}
        </button>
    );
}
