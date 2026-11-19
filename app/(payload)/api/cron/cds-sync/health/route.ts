import config from "@payload-config";
import { getPayload } from "payload";
import { healthOf } from "@/lib/cds/cron";

/** Public heartbeat for the hourly GitHub check: 200 when the sync succeeded in the last hour, else 503. */
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getPayload({ config });
  const status = await payload.findGlobal({ slug: "cds-sync-status", depth: 0 });
  const health = healthOf(status, new Date());
  return Response.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
