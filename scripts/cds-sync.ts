/**
 * Run the CDS sync from a terminal (the same engine the 15-minute cron runs).
 *   pnpm cds:sync --dry-run   print what would change, write nothing
 *   pnpm cds:sync             apply it
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { runCdsSync } from "@/lib/cds/sync";
import { mapByCollections } from "@/lib/cds/scope";

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env.local`);
  return v;
};

const dryRun = process.argv.includes("--dry-run");
const payload = await getPayload({ config });
const result = await runCdsSync(payload, { token: required("NPR_CDS_TOKEN"), typesafeKey: required("TYPESAFE_API_KEY") }, { dryRun, log: console.log });
const { plan, ...counts } = result;
console.log(dryRun ? "DRY RUN (nothing written)" : "APPLIED", counts);
for (const p of plan?.create ?? []) console.log(`  + ${p.cdsId}  ${mapByCollections(p.collectionIds)?.showSlug ?? "(Jev sorts)"}  ${p.title}`);
for (const u of plan?.update ?? []) console.log(`  ~ post ${u.postId}  ${u.data.title}`);
for (const id of plan?.withdraw ?? []) console.log(`  - post ${id} (withdrawn)`);
process.exit(counts.failed > 0 ? 1 : 0);
