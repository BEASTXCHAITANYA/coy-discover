import { connection } from "next/server";
import { getDb, ME } from "@/lib/db";
import { getFeed } from "@/lib/discover";

/** GET /api/feed (also served at /feed): profiles the user has not swiped on yet. */
export async function GET() {
  await connection(); // per-request data from a synchronous DB: never prerender or cache
  return Response.json(
    { profiles: getFeed(getDb(), ME) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
