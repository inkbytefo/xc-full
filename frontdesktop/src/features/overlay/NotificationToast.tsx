// ============================================================================
// Notification Toast System - Non-intrusive alerts with slide-in animation
// ============================================================================

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

// SVG Icons
const InfoIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const SuccessIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="22,4 12,14.01 9,11.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const WarningIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
);

const ErrorIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    exiting?: boolean;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? 4000,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        setTimeout(() => {
            setToasts(prev =>
                prev.map(t => t.id === id ? { ...t, exiting: true } : t)
            );
            // Remove from DOM after exit animation
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 250);
        }, newToast.duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev =>
            prev.map(t => t.id === id ? { ...t, exiting: true } : t)
        );
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 250);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const getIcon = () => {
        switch (toast.type) {
            case 'info': return <InfoIcon />;
            case 'success': return <SuccessIcon />;
            case 'warning': return <WarningIcon />;
            case 'error': return <ErrorIcon />;
        }
    };

    return (
        <div
            className={`toast ${toast.exiting ? 'exiting' : ''}`}
            style={{ '--toast-duration': `${toast.duration}ms` } as React.CSSProperties}
            onClick={() => onRemove(toast.id)}
        >
            <div className="toast-header">
                <div className={`toast-icon ${toast.type}`}>
                    {getIcon()}
                </div>
                <span className="toast-title">{toast.title}</span>
            </div>
            {toast.message && (
                <div className="toast-message">{toast.message}</div>
            )}
            <div className="toast-progress" />
        </div>
    );
}

// Helper hook for common toast operations
export function useNotifications() {
    const { addToast } = useToast();

    return {
        info: (title: string, message?: string) =>
            addToast({ type: 'info', title, message }),
        success: (title: string, message?: string) =>
            addToast({ type: 'success', title, message }),
        warning: (title: string, message?: string) =>
            addToast({ type: 'warning', title, message }),
        error: (title: string, message?: string) =>
            addToast({ type: 'error', title, message }),
    };
}
