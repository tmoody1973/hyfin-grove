/**
 * Import HYFIN-tagged Uniquely Milwaukee episodes from radiomilwaukee.org (decision 009). The 15-minute cron runs
 * the same code; this is for a first run, a backfill check, or debugging.
 *   pnpm tsx --env-file=.env.local scripts/station-sync.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { fetchStationFeed } from "@/lib/station/feed";
import { findCdsCopy, syncStation } from "@/lib/station/sync";

const dryRun = process.argv.includes("--dry-run");
const token = process.env.NPR_CDS_TOKEN;
if (!token) throw new Error("NPR_CDS_TOKEN is not set");

async function main() {
  if (dryRun) {
    const eps = await fetchStationFeed();
    for (const ep of eps) {
      const copy = await findCdsCopy(ep, token!).catch(() => null);
      console.log(`  ${ep.publishedAt.slice(0, 10)} ${copy?.audioUrl ? "audio ✓" : "no audio"} ${ep.title}`);
    }
    console.log({ episodes: eps.length, dryRun });
    return;
  }
  const payload = await getPayload({ config });
  console.log(await syncStation(payload, { fetchFeed: () => fetchStationFeed(), findCopy: (ep) => findCdsCopy(ep, token!), log: console.log }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
