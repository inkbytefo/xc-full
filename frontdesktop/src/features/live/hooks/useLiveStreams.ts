import { useQuery } from "@tanstack/react-query";
import type { ListResponse, Stream } from "../../../api/types";
import { fetchCategoryStreams, fetchStreams } from "../liveApi";
import { liveKeys } from "./liveKeys";

export function useLiveStreams(params?: { limit?: number }) {
  const limit = params?.limit ?? 40;

  return useQuery<ListResponse<Stream>>({
    queryKey: liveKeys.streamsList(null, limit),
    queryFn: async () => fetchStreams({ limit }),
  });
}

export function useCategoryStreams(categoryId: string | null, params?: { limit?: number }) {
  const limit = params?.limit ?? 40;

  return useQuery<ListResponse<Stream>>({
    queryKey: liveKeys.streamsList(categoryId, limit),
    queryFn: async () => fetchCategoryStreams(categoryId as string, { limit }),
    enabled: categoryId !== null,
  });
}

