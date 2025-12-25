// ============================================================================
// useFeedQuery - Feed with React Query (useInfiniteQuery)
// ============================================================================
// Replaces useInfiniteFeed.ts with React Query benefits:
// - Automatic caching
// - Background refetch
// - Optimistic updates ready

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post, ListResponse } from "../../../api/types";
import {
    fetchFeed,
    createPost as createPostApi,
    type TimelineFilter,
    type CreatePostRequest,
} from "../feedApi";

// ============================================================================
// Query Keys
// ============================================================================

export const feedKeys = {
    all: ["feed"] as const,
    list: (filter: TimelineFilter) => ["feed", "list", filter] as const,
};

// ============================================================================
// useFeed - Infinite Query for Feed Posts
// ============================================================================

export function useFeed(filter: TimelineFilter) {
    return useInfiniteQuery<ListResponse<Post>>({
        queryKey: feedKeys.list(filter),
        queryFn: async ({ pageParam }) => {
            return fetchFeed({
                filter,
                cursor: pageParam as string | undefined,
                limit: 20,
            });
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// ============================================================================
// useCreatePost - Create New Post Mutation
// ============================================================================

export function useCreatePost(filter: TimelineFilter) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePostRequest) => {
            const res = await createPostApi(data);
            return res.data;
        },

        onSuccess: (newPost) => {
            // Prepend new post to feed
            queryClient.setQueryData<{
                pages: ListResponse<Post>[];
                pageParams: (string | undefined)[];
            }>(feedKeys.list(filter), (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page, index) =>
                        index === 0
                            ? { ...page, data: [newPost, ...page.data] }
                            : page
                    ),
                };
            });
        },
    });
}

// ============================================================================
// Helper: Get all posts from infinite query
// ============================================================================

export function flattenFeedPages(data: { pages: ListResponse<Post>[] } | undefined): Post[] {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
}
