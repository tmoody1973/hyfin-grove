/**
 * Rebuild the stored text (cdsBody) of synced CDS stories from CDS, e.g. after the converter learns a new block
 * kind (plan 6b task 8: Mixcloud/YouTube players). Writes only posts whose text changes.
 *   pnpm tsx --env-file=.env.local scripts/refresh-cds-bodies.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { fetchScopedDocuments } from "@/lib/cds/client";
import { toPostData } from "@/lib/cds/toPost";

const dryRun = process.argv.includes("--dry-run");
// Postgres jsonb re-sorts object keys, so compare with keys sorted.
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
const token = process.env.NPR_CDS_TOKEN;
if (!token) throw new Error("NPR_CDS_TOKEN is not set");

async function main() {
  const payload = await getPayload({ config });
  const docs = await fetchScopedDocuments(token!);
  let changed = 0, gainedPlayer = 0, missing = 0;
  for (const doc of docs) {
    const data = toPostData(doc);
    const { docs: found } = await payload.find({ collection: "posts", where: { "cds.documentId": { equals: doc.id } }, limit: 1, depth: 0, select: { title: true, cdsBody: true } });
    const post = found[0];
    if (!post) { missing++; continue; }
    if (stable(post.cdsBody ?? []) === stable(data.cdsBody)) continue;
    changed++;
    const players = data.cdsBody.filter((b) => b.kind === "embed");
    if (players.length) { gainedPlayer++; console.log(`  #${post.id} +${players.length} player(s) [${players.map((p) => (p as { provider: string }).provider).join(",")}]: ${post.title.slice(0, 60)}`); }
    if (!dryRun) await payload.update({ collection: "posts", id: post.id, data: { cdsBody: data.cdsBody }, depth: 0 });
  }
  console.log({ cdsDocs: docs.length, changed, gainedPlayer, notImported: missing, dryRun });
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
