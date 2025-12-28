import { useQuery } from "@tanstack/react-query";
import type { Stream } from "../../../api/types";
import { getStream } from "../liveApi";
import { liveKeys } from "./liveKeys";

export function useLiveStream(streamId: string | null) {
  return useQuery<Stream>({
    queryKey: streamId ? liveKeys.stream(streamId) : liveKeys.stream(""),
    queryFn: async () => getStream(streamId as string),
    enabled: streamId !== null,
  });
}

