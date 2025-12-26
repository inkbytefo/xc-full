// ============================================================================
// Media API - File Upload Backend Integration
// ============================================================================

import { api } from "../../api/client";

export interface MediaFile {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    type: "image" | "video" | "audio" | "document";
    size: number;
    url: string;
    createdAt: string;
}

// Upload a file
export async function uploadFile(file: File): Promise<MediaFile> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ data: MediaFile }>("/api/v1/media/upload", formData);
    return res.data;
}

// Get a media file by ID
export async function getMedia(id: string): Promise<MediaFile> {
    const res = await api.get<{ data: MediaFile }>(`/api/v1/media/${id}`);
    return res.data;
}

// List user's media files
export async function listMedia(params?: {
    limit?: number;
    offset?: number;
}): Promise<MediaFile[]> {
    const res = await api.get<{ data: MediaFile[] }>("/api/v1/media", {
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
    });
    return res.data;
}

// Delete a media file
export async function deleteMedia(id: string): Promise<void> {
    await api.delete(`/api/v1/media/${id}`);
}

// Helper: Check if MIME type is image
export function isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/");
}

// Helper: Check if MIME type is video
export function isVideo(mimeType: string): boolean {
    return mimeType.startsWith("video/");
}

// Helper: Format file size
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
