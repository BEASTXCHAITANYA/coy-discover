import { connection } from "next/server";
import { getDb, ME } from "@/lib/db";
import { getMatches } from "@/lib/discover";

/** GET /api/matches (also served at /matches): the user's mutual matches. */
export async function GET() {
  await connection();
  return Response.json(
    { matches: getMatches(getDb(), ME) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
