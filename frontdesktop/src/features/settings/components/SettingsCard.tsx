// ============================================================================
// Settings Card Component - Glassmorphic container for settings sections
// ============================================================================

import { ReactNode } from 'react';

interface SettingsCardProps {
    title?: string;
    icon?: string;
    children: ReactNode;
    className?: string;
    danger?: boolean;
}

export function SettingsCard({ title, icon, children, className = '', danger = false }: SettingsCardProps) {
    const baseClasses = danger
        ? 'bg-red-500/5 backdrop-blur-md rounded-xl p-6 border border-red-500/20'
        : 'bg-[#0a0a0f]/80 backdrop-blur-xl rounded-xl p-6 border border-white/10';

    return (
        <div className={`${baseClasses} ${className}`}>
            {title && (
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${danger ? 'text-red-400' : 'text-white'}`}>
                    {icon && <span className="text-xl">{icon}</span>}
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
}

// Preset for setting item rows
interface SettingRowProps {
    label: string;
    description?: string;
    children: ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex-1 mr-4">
                <div className="font-medium text-white">{label}</div>
                {description && (
                    <div className="text-sm text-zinc-500">{description}</div>
                )}
            </div>
            <div className="flex-shrink-0">
                {children}
            </div>
        </div>
    );
}
