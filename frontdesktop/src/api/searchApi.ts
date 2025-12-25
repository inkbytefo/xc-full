// ============================================================================
// Global Search API
// ============================================================================

import { api } from "./client";

// Search result types
export interface SearchUser {
    id: string;
    handle: string;
    displayName: string;
    avatarGradient: [string, string];
    isVerified: boolean;
}

export interface SearchServer {
    id: string;
    name: string;
    icon?: string;
    memberCount: number;
    isPublic: boolean;
}

export interface SearchPost {
    id: string;
    content: string;
    authorId: string;
    authorHandle: string;
    authorDisplayName: string;
    createdAt: string;
}

export interface GlobalSearchResult {
    users: SearchUser[];
    servers: SearchServer[];
    posts: SearchPost[];
}

// Global search across users, servers, and posts
export async function globalSearch(query: string, limit?: number): Promise<GlobalSearchResult> {
    const res = await api.get<{ data: GlobalSearchResult }>("/api/v1/search", {
        q: query,
        limit: limit ?? 5,
    });
    return res.data;
}

// Search only users
export async function searchUsers(query: string, limit?: number): Promise<SearchUser[]> {
    const res = await api.get<{ data: SearchUser[] }>("/api/v1/search/users", {
        q: query,
        limit: limit ?? 20,
    });
    return res.data;
}

// Search only servers
export async function searchServers(query: string, limit?: number): Promise<SearchServer[]> {
    const res = await api.get<{ data: SearchServer[] }>("/api/v1/search/servers", {
        q: query,
        limit: limit ?? 20,
    });
    return res.data;
}

// Search only posts
export async function searchPosts(query: string, limit?: number): Promise<SearchPost[]> {
    const res = await api.get<{ data: SearchPost[] }>("/api/v1/search/posts", {
        q: query,
        limit: limit ?? 20,
    });
    return res.data;
}
