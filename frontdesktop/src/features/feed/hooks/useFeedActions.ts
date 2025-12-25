// ============================================================================
// useFeedActions - Post Actions with React Query Mutations
// ============================================================================
// Like, Repost, Bookmark mutations with optimistic updates.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post, ListResponse } from "../../../api/types";
import {
    toggleLike,
    toggleRepost,
    toggleBookmark,
    type ToggleLikeResponse,
    type ToggleRepostResponse,
    type ToggleBookmarkResponse,
    type TimelineFilter,
} from "../feedApi";
import { feedKeys } from "./useFeedQuery";

// ============================================================================
// Types
// ============================================================================

type ActionKind = "like" | "repost" | "bookmark";

interface FeedCacheData {
    pages: ListResponse<Post>[];
    pageParams: (string | undefined)[];
}

// ============================================================================
// Optimistic Update Helpers
// ============================================================================

function optimisticLike(post: Post): Post {
    const next = !post.isLiked;
    return { ...post, isLiked: next, likeCount: Math.max(0, post.likeCount + (next ? 1 : -1)) };
}

function optimisticRepost(post: Post): Post {
    const next = !post.isReposted;
    return { ...post, isReposted: next, repostCount: Math.max(0, post.repostCount + (next ? 1 : -1)) };
}

function optimisticBookmark(post: Post): Post {
    return { ...post, isBookmarked: !post.isBookmarked };
}

function applyLikeResponse(post: Post, res: ToggleLikeResponse): Post {
    const delta = res.liked ? 1 : -1;
    return {
        ...post,
        isLiked: res.liked,
        likeCount: Math.max(0, post.likeCount + (post.isLiked !== res.liked ? delta : 0)),
    };
}

function applyRepostResponse(post: Post, res: ToggleRepostResponse): Post {
    const delta = res.reposted ? 1 : -1;
    return {
        ...post,
        isReposted: res.reposted,
        repostCount: Math.max(0, post.repostCount + (post.isReposted !== res.reposted ? delta : 0)),
    };
}

function applyBookmarkResponse(post: Post, res: ToggleBookmarkResponse): Post {
    return { ...post, isBookmarked: res.bookmarked };
}

// ============================================================================
// Update Post in Cache
// ============================================================================

function updatePostInCache(
    queryClient: ReturnType<typeof useQueryClient>,
    filter: TimelineFilter,
    postId: string,
    updater: (post: Post) => Post
) {
    queryClient.setQueryData<FeedCacheData>(feedKeys.list(filter), (old) => {
        if (!old) return old;
        return {
            ...old,
            pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((p) => (p.id === postId ? updater(p) : p)),
            })),
        };
    });
}

// ============================================================================
// useLikePost
// ============================================================================

export function useLikePost(filter: TimelineFilter) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: string) => toggleLike(postId),

        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: feedKeys.list(filter) });
            const previous = queryClient.getQueryData<FeedCacheData>(feedKeys.list(filter));
            updatePostInCache(queryClient, filter, postId, optimisticLike);
            return { previous };
        },

        onSuccess: (res, postId) => {
            updatePostInCache(queryClient, filter, postId, (p) => applyLikeResponse(p, res));
        },

        onError: (_err, _postId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(feedKeys.list(filter), context.previous);
            }
        },
    });
}

// ============================================================================
// useRepostPost
// ============================================================================

export function useRepostPost(filter: TimelineFilter) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: string) => toggleRepost(postId),

        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: feedKeys.list(filter) });
            const previous = queryClient.getQueryData<FeedCacheData>(feedKeys.list(filter));
            updatePostInCache(queryClient, filter, postId, optimisticRepost);
            return { previous };
        },

        onSuccess: (res, postId) => {
            updatePostInCache(queryClient, filter, postId, (p) => applyRepostResponse(p, res));
        },

        onError: (_err, _postId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(feedKeys.list(filter), context.previous);
            }
        },
    });
}

// ============================================================================
// useBookmarkPost
// ============================================================================

export function useBookmarkPost(filter: TimelineFilter) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: string) => toggleBookmark(postId),

        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: feedKeys.list(filter) });
            const previous = queryClient.getQueryData<FeedCacheData>(feedKeys.list(filter));
            updatePostInCache(queryClient, filter, postId, optimisticBookmark);
            return { previous };
        },

        onSuccess: (res, postId) => {
            updatePostInCache(queryClient, filter, postId, (p) => applyBookmarkResponse(p, res));
        },

        onError: (_err, _postId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(feedKeys.list(filter), context.previous);
            }
        },
    });
}

// ============================================================================
// useFeedActions - Combined Hook
// ============================================================================

export function useFeedActions(filter: TimelineFilter) {
    const likeMutation = useLikePost(filter);
    const repostMutation = useRepostPost(filter);
    const bookmarkMutation = useBookmarkPost(filter);

    return {
        like: likeMutation.mutate,
        repost: repostMutation.mutate,
        bookmark: bookmarkMutation.mutate,
        isLiking: likeMutation.isPending,
        isReposting: repostMutation.isPending,
        isBookmarking: bookmarkMutation.isPending,
        getBusyAction: (postId: string): ActionKind | null => {
            if (likeMutation.isPending && likeMutation.variables === postId) return "like";
            if (repostMutation.isPending && repostMutation.variables === postId) return "repost";
            if (bookmarkMutation.isPending && bookmarkMutation.variables === postId) return "bookmark";
            return null;
        },
    };
}
