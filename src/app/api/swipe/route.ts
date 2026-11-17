import { connection } from "next/server";
import { getDb, ME } from "@/lib/db";
import { recordSwipe, type SwipeError } from "@/lib/discover";
import { swipeLimiter } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 1024;
const ALLOWED_FIELDS = new Set(["profileId", "action"]);

const STATUS: Record<SwipeError, number> = {
  invalid_action: 400,
  invalid_profile: 400,
  self_swipe: 400,
  not_found: 404,
  already_swiped: 409,
};

const error = (code: string, status: number, headers?: HeadersInit) =>
  Response.json({ error: code }, { status, headers });

/**
 * POST /api/swipe (also served at /swipe)
 * Body: { "profileId": number, "action": "like" | "pass" }
 * 200: { "matched": false } or { "matched": true, "match": Match }
 */
export async function POST(request: Request) {
  await connection();

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = swipeLimiter.check(client);
  if (!limit.allowed) {
    return error("rate_limited", 429, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return error("unsupported_media_type", 415);
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return error("payload_too_large", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error("invalid_json", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return error("invalid_body", 400);
  if (Object.keys(body).some((k) => !ALLOWED_FIELDS.has(k))) return error("unexpected_field", 400);

  const { profileId, action } = body as { profileId?: unknown; action?: unknown };
  const result = recordSwipe(getDb(), ME, profileId, action);
  if (!result.ok) return error(result.error, STATUS[result.error]);

  return Response.json(
    result.matched ? { matched: true, match: result.match } : { matched: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
