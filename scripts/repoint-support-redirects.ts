/**
 * Plan 8: old support addresses now land on the new /support page instead of radiomilwaukee.org/donate.
 * Updates exactly these Redirects rows; deletes the /support/ row (the page answers there now). Prints before/after.
 *   pnpm tsx --env-file=.env.local scripts/repoint-support-redirects.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";

const REPOINT = ["/donate/", "/support-hyfin/", "/hyfinoldsupport/"];
const DELETE = "/support/";
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({ collection: "redirects", where: { from: { in: [...REPOINT, DELETE] } }, limit: 10, depth: 0 });
  for (const row of docs as Array<{ id: number; from: string; to?: { url?: string | null } | null }>) {
    if (row.from === DELETE) {
      console.log(`delete ${row.from} (was -> ${row.to?.url})`);
      if (!dryRun) await payload.delete({ collection: "redirects", id: row.id });
    } else {
      console.log(`${row.from}: ${row.to?.url} -> /support`);
      if (!dryRun) await payload.update({ collection: "redirects", id: row.id, data: { to: { type: "custom", url: "/support" } } });
    }
  }
  console.log({ found: docs.length, dryRun });
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
