export const liveKeys = {
  all: ["live"] as const,
  streams: () => ["live", "streams"] as const,
  streamsList: (categoryId: string | null, limit: number) => ["live", "streams", "list", categoryId ?? "all", limit] as const,
  stream: (id: string) => ["live", "streams", "detail", id] as const,
  categories: () => ["live", "categories"] as const,
};

