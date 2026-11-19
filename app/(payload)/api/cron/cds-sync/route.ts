import config from "@payload-config";
import { getPayload } from "payload";
import { isAuthorizedCron } from "@/lib/cds/cron";
import { runCdsSync } from "@/lib/cds/sync";

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
  try {
    const counts = await runCdsSync(payload, { token, typesafeKey });
    return Response.json({ ok: counts.failed === 0, counts }, { status: counts.failed === 0 ? 200 : 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    payload.logger.error(`[cds-sync] run failed: ${message}`);
    return Response.json({ ok: false, error: message.slice(0, 200) }, { status: 500 });
  }
}
