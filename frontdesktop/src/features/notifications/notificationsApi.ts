// ============================================================================
// Notifications API - Backend Integration
// ============================================================================

import { api } from "../../api/client";
import type { Notification, ListResponse } from "../../api/types";

// Fetch notifications
export async function fetchNotifications(params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<Notification>> {
    return api.get<ListResponse<Notification>>("/api/v1/notifications", {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
    const res = await api.get<{ data: { unreadCount: number } }>("/api/v1/notifications/unread/count");
    return res.data.unreadCount;
}

// Mark notification as read
export async function markAsRead(id: string): Promise<void> {
    await api.patch(`/api/v1/notifications/${id}/read`);
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<void> {
    await api.post("/api/v1/notifications/read-all");
}

// Delete notification
export async function deleteNotification(id: string): Promise<void> {
    await api.delete(`/api/v1/notifications/${id}`);
}
