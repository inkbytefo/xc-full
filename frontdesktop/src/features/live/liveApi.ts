// ============================================================================
// Live API - Backend Integration (Aligned with Backend Response Format)
// ============================================================================

import { api } from "../../api/client";
import type { Stream, Category, ListResponse } from "../../api/types";

// ============================================================================
// Stream Endpoints
// ============================================================================

// Fetch live streams
export async function fetchStreams(params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<Stream>> {
    return api.get<ListResponse<Stream>>("/api/v1/live/streams", {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}

// Get stream by ID
export async function getStream(id: string): Promise<Stream> {
    const res = await api.get<{ data: Stream }>(`/api/v1/live/streams/${id}`);
    return res.data;
}

// Start a new stream
export async function startStream(data: {
    title: string;
    description?: string;
    categoryId?: string;
    isNsfw?: boolean;
}): Promise<Stream> {
    const res = await api.post<{ data: Stream }>("/api/v1/live/streams", data);
    return res.data;
}

// Update a stream
export async function updateStream(id: string, data: {
    title?: string;
    description?: string;
    categoryId?: string;
    isNsfw?: boolean;
}): Promise<Stream> {
    const res = await api.patch<{ data: Stream }>(`/api/v1/live/streams/${id}`, data);
    return res.data;
}

// Go live
export async function goLive(id: string): Promise<void> {
    await api.post(`/api/v1/live/streams/${id}/live`);
}

// End stream
export async function endStream(id: string): Promise<void> {
    await api.delete(`/api/v1/live/streams/${id}`);
}

// ============================================================================
// Category Endpoints
// ============================================================================

// Fetch all categories
export async function fetchCategories(): Promise<Category[]> {
    const res = await api.get<{ data: Category[] }>("/api/v1/live/categories");
    return res.data;
}

// Fetch streams by category
export async function fetchCategoryStreams(categoryId: string, params?: {
    cursor?: string;
    limit?: number;
}): Promise<ListResponse<Stream>> {
    return api.get<ListResponse<Stream>>(`/api/v1/live/categories/${categoryId}/streams`, {
        cursor: params?.cursor,
        limit: params?.limit ?? 20,
    });
}
