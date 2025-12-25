import { useEffect, useState, useCallback } from "react";
import type { Notification } from "../../api/types";
import { fetchNotifications, markAsRead, markAllAsRead } from "./notificationsApi";
import { Modal } from "../../components/Modal";

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetchNotifications();
                if (!cancelled) {
                    setNotifications(res.data);
                    setLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Bildirimler yüklenemedi");
                    setLoading(false);
                }
            }
        }
        load();
        return () => { cancelled = true; };
    }, [isOpen]);

    const handleMarkAsRead = useCallback(async (id: string) => {
        try {
            await markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
        } catch {
            // Ignore errors
        }
    }, []);

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch {
            // Ignore errors
        }
    }, []);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "like": return "❤️";
            case "comment": return "💬";
            case "follow": return "👤";
            case "mention": return "@";
            case "repost": return "🔁";
            default: return "🔔";
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} position="right" showCloseButton={false}>
            {/* Custom Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0f0f15]/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">Bildirimler</h2>
                    {unreadCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-xs font-medium">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            Tümünü oku
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            {error && (
                <div className="p-4 text-red-400 text-sm bg-red-500/10">{error}</div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <span className="text-3xl">🔔</span>
                    </div>
                    <p className="font-medium">Henüz bildirim yok</p>
                    <p className="text-sm mt-1 text-zinc-600">Yeni bildirimler burada görünecek</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {notifications.map((notification) => (
                        <button
                            key={notification.id}
                            onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                            className={`w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors text-left ${!notification.isRead ? "bg-purple-500/5" : ""
                                }`}
                        >
                            {/* Actor Avatar or Icon */}
                            {notification.actor ? (
                                <div
                                    className="w-10 h-10 rounded-full shrink-0 ring-2 ring-white/10"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${notification.actor.avatarGradient[0]}, ${notification.actor.avatarGradient[1]})`,
                                    }}
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg shrink-0">
                                    {getNotificationIcon(notification.type)}
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-zinc-200 text-sm">
                                    {notification.actor && (
                                        <span className="font-semibold text-white">
                                            {notification.actor.displayName}{" "}
                                        </span>
                                    )}
                                    {notification.message}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1.5">
                                    {new Date(notification.createdAt).toLocaleString("tr-TR", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            {/* Unread indicator */}
                            {!notification.isRead && (
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 mt-1.5 animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
}

// Hook for notification state management
export function useNotifications() {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    return { isOpen, open, close, toggle };
}
