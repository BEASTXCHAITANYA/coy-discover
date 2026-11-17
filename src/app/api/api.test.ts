import { describe, it, expect, beforeEach, vi } from "vitest";

// Route handlers call connection(), which needs a live Next.js request scope.
vi.mock("next/server", () => ({ connection: async () => {} }));
process.env.COY_DB_PATH = ":memory:";

const { getDb, reset } = await import("@/lib/db");
const { SEED_PROFILES } = await import("@/lib/seed-data");
const feedRoute = await import("./feed/route");
const swipeRoute = await import("./swipe/route");
const matchesRoute = await import("./matches/route");

const LIKER = SEED_PROFILES.findIndex((p) => p.likesYou) + 2;
const NON_LIKER = SEED_PROFILES.findIndex((p) => !p.likesYou) + 2;

let clientCounter = 0;
function swipeRequest(body: unknown, init: { client?: string; contentType?: string; raw?: string } = {}) {
  return new Request("http://localhost/api/swipe", {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      // A fresh client per request keeps the shared rate limiter out of unrelated tests.
      "x-forwarded-for": init.client ?? `10.0.0.${++clientCounter}`,
    },
    body: init.raw ?? JSON.stringify(body),
  });
}

const swipe = (body: unknown, init?: Parameters<typeof swipeRequest>[1]) => swipeRoute.POST(swipeRequest(body, init));

beforeEach(() => reset(getDb()));

describe("GET /feed", () => {
  it("returns 200 with all unswiped profiles and no-store caching", async () => {
    const res = await feedRoute.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { profiles } = await res.json();
    expect(profiles).toHaveLength(SEED_PROFILES.length);
  });

  it("drops a profile once it has been swiped", async () => {
    await swipe({ profileId: NON_LIKER, action: "pass" });
    const { profiles } = await (await feedRoute.GET()).json();
    expect(profiles.map((p: { id: number }) => p.id)).not.toContain(NON_LIKER);
  });
});

describe("POST /swipe", () => {
  it("returns { matched: true, match } for a mutual like", async () => {
    const res = await swipe({ profileId: LIKER, action: "like" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(true);
    expect(body.match.id).toBe(LIKER);
    expect(Object.keys(body)).toEqual(["matched", "match"]);
  });

  it("returns exactly { matched: false } for a non-mutual like and for any pass", async () => {
    for (const [profileId, action] of [
      [NON_LIKER, "like"],
      [LIKER, "pass"],
    ] as const) {
      const res = await swipe({ profileId, action });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ matched: false });
    }
  });

  it("returns the same pass response whether or not that person liked the user", async () => {
    const a = await (await swipe({ profileId: LIKER, action: "pass" })).json();
    const b = await (await swipe({ profileId: NON_LIKER, action: "pass" })).json();
    expect(a).toEqual(b);
  });

  it.each([
    ["invalid JSON", { raw: "{not json" }, 400, "invalid_json"],
    ["a non-object body", { raw: "[1,2]" }, 400, "invalid_body"],
    ["an unknown field", { raw: JSON.stringify({ profileId: 2, action: "like", likedMe: true }) }, 400, "unexpected_field"],
    ["a bad action", { raw: JSON.stringify({ profileId: 2, action: "superlike" }) }, 400, "invalid_action"],
    ["a string id", { raw: JSON.stringify({ profileId: "2", action: "like" }) }, 400, "invalid_profile"],
    ["a self-swipe", { raw: JSON.stringify({ profileId: 1, action: "like" }) }, 400, "self_swipe"],
    ["an unknown profile", { raw: JSON.stringify({ profileId: 9999, action: "like" }) }, 404, "not_found"],
    ["a non-JSON content type", { raw: "profileId=2", contentType: "application/x-www-form-urlencoded" }, 415, "unsupported_media_type"],
    ["an oversized body", { raw: JSON.stringify({ profileId: 2, action: "like", pad: "x".repeat(2000) }) }, 413, "payload_too_large"],
  ])("rejects %s", async (_label, init, status, code) => {
    const res = await swipe(undefined, init);
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: code });
  });

  it("returns 409 for a repeat swipe and never flips a pass into a like", async () => {
    await swipe({ profileId: LIKER, action: "pass" });
    const res = await swipe({ profileId: LIKER, action: "like" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_swiped" });
    const { matches } = await (await matchesRoute.GET()).json();
    expect(matches).toEqual([]);
  });

  it("creates exactly one match when the same like arrives twice at once", async () => {
    const results = await Promise.all([
      swipe({ profileId: LIKER, action: "like" }),
      swipe({ profileId: LIKER, action: "like" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const { matches } = await (await matchesRoute.GET()).json();
    expect(matches).toHaveLength(1);
  });

  it("rate-limits a client that swipes faster than any person could", async () => {
    const client = "203.0.113.7";
    const ids = Array.from({ length: 61 }, (_, i) => (i % SEED_PROFILES.length) + 2);
    const statuses: number[] = [];
    for (const id of ids) statuses.push((await swipe({ profileId: id, action: "pass" }, { client })).status);
    expect(statuses.slice(0, 60).every((s) => s !== 429)).toBe(true);
    expect(statuses[60]).toBe(429);
    const blocked = await swipe({ profileId: 2, action: "pass" }, { client });
    expect(blocked.headers.get("retry-after")).toMatch(/^\d+$/);
  });
});

describe("GET /matches", () => {
  it("lists mutual matches only", async () => {
    await swipe({ profileId: LIKER, action: "like" });
    await swipe({ profileId: NON_LIKER, action: "like" });
    const res = await matchesRoute.GET();
    expect(res.status).toBe(200);
    const { matches } = await res.json();
    expect(matches.map((m: { id: number }) => m.id)).toEqual([LIKER]);
  });
});
