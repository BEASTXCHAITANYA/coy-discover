import type { Match, PublicProfile, SwipeAction } from "./discover";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error ?? "request_failed");
  return body as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export const api = {
  feed: () => request<{ profiles: PublicProfile[] }>("/api/feed").then((r) => r.profiles),
  matches: () => request<{ matches: Match[] }>("/api/matches").then((r) => r.matches),
  swipe: (profileId: number, action: SwipeAction) =>
    request<{ matched: false } | { matched: true; match: Match }>("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action }),
    }),
  reset: () => request<{ ok: true }>("/api/reset", { method: "POST" }),
};
