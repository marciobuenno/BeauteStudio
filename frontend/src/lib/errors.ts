import { ApiError } from "@/lib/api";

// Human message from an ApiError — the backend sends pt-BR strings in `detail`.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const detail = (err.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}
