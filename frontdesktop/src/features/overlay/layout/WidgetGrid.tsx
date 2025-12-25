import { ReactNode } from 'react';

interface WidgetGridProps {
    children: ReactNode;
    className?: string;
    pinnedView?: boolean;
}

export function WidgetGrid({ children, className = '', pinnedView = false }: WidgetGridProps) {
    if (pinnedView) return null;

    return (
        <div className={`widget-grid ${className}`}>
            {children}
        </div>
    );
}
