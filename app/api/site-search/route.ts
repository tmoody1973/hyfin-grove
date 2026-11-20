import config from "@payload-config";
import { getPayload } from "payload";
import { createRateLimiter } from "@/lib/forms/rateLimit";
import { normalizeQuery, searchSite } from "@/lib/search/query";
import { searchSongs } from "@/lib/search/songs";

// Not /api/search: Payload answers that address (its own, staff-only search index API).
const allow = createRateLimiter(30, 60_000);

/** The search panel's results as you type (plan 12). Not logged: only /search records what people searched for. */
export async function GET(req: Request) {
  const q = normalizeQuery(new URL(req.url).searchParams.get("q"));
  if (!q) return Response.json({ error: "Type at least two letters." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(ip)) return Response.json({ error: "Too many searches. Wait a minute." }, { status: 429 });
  const [result, songs] = await Promise.all([searchSite(await getPayload({ config }), { q, limit: 8 }), searchSongs(q, Date.now(), 3)]);
  return Response.json({ q, ...result, songs }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
