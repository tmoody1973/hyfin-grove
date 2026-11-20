/**
 * Run the NPR sync by hand (plan 11; the 15-minute cron runs it too). --dry-run prints the plan without writing.
 *   pnpm tsx --env-file=.env.local scripts/npr-sync.ts [--dry-run]
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { runNprSync } from "@/lib/npr/sync";

const token = process.env.NPR_CDS_TOKEN;
if (!token) throw new Error("NPR_CDS_TOKEN is not set");
const payload = await getPayload({ config });
if (process.argv.includes("--dry-run")) {
  const { docs } = await payload.find({ collection: "posts", where: { source: { equals: "npr" } }, pagination: false, depth: 0, select: { title: true, npr: true, cds: true } });
  console.log({ storedNprCopies: docs.length, sample: docs.slice(0, 5).map((d) => `${d.cds?.documentId} · ${d.npr?.origin} · ${d.title}`) });
  process.exit(0);
}
console.log(await runNprSync(payload, { token, log: (l) => console.log(l) }));
process.exit(0);
