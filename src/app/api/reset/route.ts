import { connection } from "next/server";
import { getDb, reset } from "@/lib/db";

/**
 * POST /api/reset: demo-only helper that restores the seeded state so a
 * reviewer can replay the flow. Disabled in production unless
 * COY_ALLOW_RESET=true is set.
 */
export async function POST() {
  await connection();
  if (process.env.NODE_ENV === "production" && process.env.COY_ALLOW_RESET !== "true") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  reset(getDb());
  return Response.json({ ok: true });
}
