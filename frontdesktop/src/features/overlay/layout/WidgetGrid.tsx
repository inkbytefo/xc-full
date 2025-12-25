import { ReactNode } from 'react';

interface WidgetGridProps {
    children: ReactNode;
    className?: string;
    ghostMode?: boolean;
}

export function WidgetGrid({ children, className = '', ghostMode = false }: WidgetGridProps) {
    if (ghostMode) return null; // In ghost mode, we don't render the grid

    return (
        <div className={`widget-grid ${className}`}>
            {children}
        </div>
    );
}
