/**
 * Seed one-off old hyfin.org addresses into the Redirects collection (plan 7, task 4) from data/legacy-redirects.json.
 * Creates missing rows only; a row staff already have for the same address is left alone.
 *   pnpm tsx --env-file=.env.local scripts/seed-redirects.ts --dry-run
 */
import config from "@payload-config";
import { readFileSync } from "node:fs";
import { getPayload } from "payload";
import { safeTarget } from "@/lib/legacy/resolve";

type Row = { from: string; to: string; why: string };
const dryRun = process.argv.includes("--dry-run");
const rows = (JSON.parse(readFileSync("data/legacy-redirects.json", "utf8")) as { redirects: Row[] }).redirects;

async function main() {
  const bad = rows.filter((r) => !safeTarget(r.to) || !r.from.startsWith("/"));
  if (bad.length) throw new Error(`Refusing unsafe rows: ${bad.map((r) => r.from).join(", ")}`);
  const payload = await getPayload({ config });
  let created = 0, kept = 0;
  for (const r of rows) {
    const from = r.from.toLowerCase();
    const { totalDocs } = await payload.count({ collection: "redirects", where: { from: { in: [from, from.replace(/\/$/, "")] } } });
    if (totalDocs) { kept++; continue; }
    if (!dryRun) await payload.create({ collection: "redirects", data: { from, to: { type: "custom", url: r.to } } });
    created++;
  }
  console.log({ rows: rows.length, created, alreadyThere: kept, dryRun });
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
