import config from "@payload-config";
import { getPayload } from "payload";
import { isAuthorizedCron } from "@/lib/cds/cron";
import { runCdsSync } from "@/lib/cds/sync";
import { fetchStationFeed } from "@/lib/station/feed";
import { findCdsCopy, syncStation } from "@/lib/station/sync";

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
  return Response.json({ ...body, station }, { status: body.ok ? 200 : 500 });
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
