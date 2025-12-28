import { useQuery } from "@tanstack/react-query";
import type { Category } from "../../../api/types";
import { fetchCategories } from "../liveApi";
import { liveKeys } from "./liveKeys";

export function useLiveCategories() {
  return useQuery<Category[]>({
    queryKey: liveKeys.categories(),
    queryFn: async () => fetchCategories(),
  });
}

