/**
 * Rebuild site search (plan 12): every story, show, host, event and page through the same beforeSearchSync the search
 * plugin runs on save, so a reindex and a normal save always agree. Idempotent: updates rows that exist, adds missing
 * ones. Drafts are skipped, as the plugin does.
 *   pnpm tsx --env-file=.env.local scripts/search-reindex.ts [--dry-run]
 */
import config from "@payload-config";
import { createLocalReq, getPayload } from "payload";
import { beforeSearchSync } from "@/lib/search/sync";

const dryRun = process.argv.includes("--dry-run");
const COLLECTIONS = ["posts", "shows", "hosts", "events", "pages"] as const;
const payload = await getPayload({ config });
const req = await createLocalReq({}, payload);
const counts: Record<string, { created: number; updated: number; visible: number; skipped: number }> = {};

for (const collection of COLLECTIONS) {
  const c = (counts[collection] = { created: 0, updated: 0, visible: 0, skipped: 0 });
  const { docs } = await payload.find({ collection, pagination: false, depth: 0, draft: false });
  const { docs: existing } = await payload.find({ collection: "search", where: { "doc.relationTo": { equals: collection } }, pagination: false, depth: 0, select: { doc: true } });
  // One row per item: keep the first, delete any duplicates (the plugin also does this on the next save).
  const rowFor = new Map<number, number>();
  for (const r of existing) {
    const v = (r.doc as { value: number | { id: number } }).value;
    const docId = typeof v === "object" ? v.id : v;
    if (!rowFor.has(docId)) rowFor.set(docId, r.id);
    else if (!dryRun) await payload.delete({ collection: "search", id: r.id });
  }
  for (const doc of docs as unknown as Array<Record<string, unknown> & { id: number }>) {
    if (doc._status === "draft") {
      c.skipped++;
      continue;
    }
    const data = await beforeSearchSync({ collectionSlug: collection, originalDoc: doc, searchDoc: { doc: { relationTo: collection, value: doc.id }, title: String(doc.title ?? doc.name ?? "") }, req });
    if (data.visible) c.visible++;
    if (dryRun) continue;
    const id = rowFor.get(doc.id);
    if (id) {
      await payload.update({ collection: "search", id, data: data as never, depth: 0 });
      c.updated++;
    } else {
      await payload.create({ collection: "search", data: data as never, depth: 0 });
      c.created++;
    }
  }
}
console.log(JSON.stringify({ dryRun, counts }, null, 1));
process.exit(0);
