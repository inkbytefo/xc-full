// ============================================================================
// DM API - Backend Integration (Aligned with Backend Response Format)
// ============================================================================

import { api } from "../../api/client";
import type { Conversation, Message, ListResponse } from "../../api/types";

// Fetch conversations
export async function fetchConversations(): Promise<Conversation[]> {
    const res = await api.get<{ data: Conversation[] }>("/api/v1/dm/conversations");
    return res.data;
}

// Start a new conversation
export async function startConversation(userId: string): Promise<Conversation> {
    const res = await api.post<{ data: Conversation }>("/api/v1/dm/conversations", { userId });
    return res.data;
}

// Get conversation details
export async function getConversation(id: string): Promise<Conversation> {
    const res = await api.get<{ data: Conversation }>(`/api/v1/dm/conversations/${id}`);
    return res.data;
}

// Fetch messages in a conversation
export async function fetchMessages(conversationId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<Message>> {
    return api.get<ListResponse<Message>>(`/api/v1/dm/conversations/${conversationId}/messages`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 50,
    });
}

// Send a message
export async function sendMessage(conversationId: string, content: string): Promise<Message> {
    const res = await api.post<{ data: Message }>(`/api/v1/dm/conversations/${conversationId}/messages`, { content });
    return res.data;
}

// Mark conversation as read
export async function markAsRead(conversationId: string): Promise<void> {
    await api.post(`/api/v1/dm/conversations/${conversationId}/read`);
}

// Edit a message
export async function editMessage(messageId: string, content: string): Promise<Message> {
    const res = await api.patch<{ data: Message }>(`/api/v1/dm/messages/${messageId}`, { content });
    return res.data;
}

// Delete a message
export async function deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/api/v1/dm/messages/${messageId}`);
}
