import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Me } from "@/types";

// Shared by the admin layout and every admin page — one query key, one cache entry.
export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiGet<Me>("/auth/me"),
    retry: false,
  });
}
