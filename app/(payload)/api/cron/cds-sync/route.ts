import config from "@payload-config";
import { getPayload } from "payload";
import { isAuthorizedCron } from "@/lib/cds/cron";
import { runCdsSync } from "@/lib/cds/sync";
import { fetchStationFeed } from "@/lib/station/feed";
import { findCdsCopy, syncStation } from "@/lib/station/sync";
import { getConcert, getConcerts } from "@/lib/events/rmEvents";
import { syncEvents } from "@/lib/events/sync";
import { pruneSubmissions } from "@/lib/forms/retention";
import { runNprSync } from "@/lib/npr/sync";

/** Called by Vercel Cron every 15 minutes (vercel.json). */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const token = process.env.NPR_CDS_TOKEN;
  const typesafeKey = process.env.TYPESAFE_API_KEY;
  if (!token || !typesafeKey) return Response.json({ ok: false, error: "CDS sync is not configured" }, { status: 500 });
  const payload = await getPayload({ config });
  let body: { ok: boolean; counts?: unknown; error?: string };
  try {
    const counts = await runCdsSync(payload, { token, typesafeKey });
    body = { ok: counts.failed === 0, counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    payload.logger.error(`[cds-sync] run failed: ${message}`);
    body = { ok: false, error: message.slice(0, 200) };
  }
  // Uniquely Milwaukee from radiomilwaukee.org (decision 009): its own trap, so it never fails the CDS sync.
  const station = await runStation(payload, token);
  const events = await runEvents(payload);
  const forms = await runPrune(payload);
  const npr = await runNpr(payload, token);
  return Response.json({ ...body, station, events, forms, npr }, { status: body.ok ? 200 : 500 });
}

async function runStation(payload: Awaited<ReturnType<typeof getPayload>>, token: string) {
  let station: Record<string, unknown>;
  try {
    station = await syncStation(payload, { fetchFeed: () => fetchStationFeed(), findCopy: (ep) => findCdsCopy(ep, token), log: (l) => payload.logger.warn(`[station-sync] ${l}`) });
  } catch (err) {
    station = { error: (err instanceof Error ? err.message : String(err)).slice(0, 200) };
    payload.logger.error(`[station-sync] run failed: ${station.error}`);
  }
  try {
    const status = await payload.findGlobal({ slug: "cds-sync-status", depth: 0 });
    const last = status.lastCounts && typeof status.lastCounts === "object" && !Array.isArray(status.lastCounts) ? status.lastCounts : {};
    await payload.updateGlobal({ slug: "cds-sync-status", data: { lastCounts: { ...last, station } } });
  } catch {
    // The status record is a convenience; the run's result is in the response and the logs.
  }
  return station;
}

/** rm-playlist concerts into Events (plan 9, decision 013): its own trap, so it never fails the CDS sync. */
async function runEvents(payload: Awaited<ReturnType<typeof getPayload>>) {
  try {
    return await syncEvents(payload, { list: () => getConcerts(), lookup: (id) => getConcert(id), now: Date.now(), log: (l) => payload.logger.warn(`[events-sync] ${l}`) });
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 200);
    payload.logger.error(`[events-sync] run failed: ${error}`);
    return { error };
  }
}

/** Form submissions older than 12 months (plan 13): its own trap, so it never fails the CDS sync. */
async function runPrune(payload: Awaited<ReturnType<typeof getPayload>>) {
  try {
    return await pruneSubmissions(payload, Date.now());
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 200);
    payload.logger.error(`[forms-prune] run failed: ${error}`);
    return { error };
  }
}

/** NPR's own stories as self-refreshing copies (plan 11, decision 015): its own trap, so it never fails the CDS sync. */
async function runNpr(payload: Awaited<ReturnType<typeof getPayload>>, token: string) {
  try {
    return await runNprSync(payload, { token });
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 200);
    payload.logger.error(`[npr-sync] run failed: ${error}`);
    return { error };
  }
}
