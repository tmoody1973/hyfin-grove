/**
 * Sync rm-playlist concerts into Events once (plan 9). The 15-minute cron runs the same code.
 *   pnpm tsx --env-file=.env.local scripts/events-sync.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { getConcert, getConcerts } from "@/lib/events/rmEvents";
import { planEventSync, syncEvents, type StoredEvent } from "@/lib/events/sync";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const payload = await getPayload({ config });
  if (dryRun) {
    const list = await getConcerts();
    if (!list.ok) throw new Error("rm-playlist unavailable");
    const { docs } = await payload.find({ collection: "events", where: { source: { equals: "rm-playlist" } }, pagination: false, depth: 0 });
    const plan = planEventSync(docs as unknown as StoredEvent[], list.value, Date.now());
    console.log({ concerts: list.value.length, create: plan.create.length, update: plan.update.length, recheck: plan.recheck.length, first: plan.create.slice(0, 3).map((e) => `${e.slug} ${e.title} ${e.startsAt}`) });
    return;
  }
  console.log(await syncEvents(payload, { list: () => getConcerts(), lookup: (id) => getConcert(id), now: Date.now(), log: console.warn }));
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
