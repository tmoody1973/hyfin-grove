/**
 * Rebuild the stored text (cdsBody) and top-photo caption/credit/alt of synced CDS stories from CDS, e.g. after the
 * converter learns something new (plan 6b: players, photo credits; NPR videos). Writes only posts that change.
 * Covers Radio Milwaukee's CDS stories and HYFIN's NPR copies (plan 11).
 *   pnpm tsx --env-file=.env.local scripts/refresh-cds-bodies.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { fetchScopedDocuments } from "@/lib/cds/client";
import { toPostData } from "@/lib/cds/toPost";
import { nprDocsById } from "@/lib/npr/sync";

const dryRun = process.argv.includes("--dry-run");
// Postgres jsonb re-sorts object keys, so compare with keys sorted.
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
const token = process.env.NPR_CDS_TOKEN;
if (!token) throw new Error("NPR_CDS_TOKEN is not set");

async function main() {
  const payload = await getPayload({ config });
  const docs = await fetchScopedDocuments(token!);
  let changed = 0, gainedPlayer = 0, missing = 0, captioned = 0;
  for (const doc of docs) {
    const data = toPostData(doc);
    const { docs: found } = await payload.find({ collection: "posts", where: { "cds.documentId": { equals: doc.id } }, limit: 1, depth: 0, select: { title: true, cdsBody: true, cds: true } });
    const post = found[0];
    if (!post) { missing++; continue; }
    const photo = { imageCaption: data.imageCaption, imageCredit: data.imageCredit, imageAlt: data.imageAlt };
    const storedPhoto = { imageCaption: post.cds?.imageCaption ?? null, imageCredit: post.cds?.imageCredit ?? null, imageAlt: post.cds?.imageAlt ?? null };
    const bodyChanged = stable(post.cdsBody ?? []) !== stable(data.cdsBody);
    const photoChanged = stable(storedPhoto) !== stable(photo);
    if (!bodyChanged && !photoChanged) continue;
    if (photoChanged) captioned++;
    changed++;
    const players = data.cdsBody.filter((b) => b.kind === "embed");
    if (players.length) { gainedPlayer++; console.log(`  #${post.id} +${players.length} player(s) [${players.map((p) => (p as { provider: string }).provider).join(",")}]: ${post.title.slice(0, 60)}`); }
    if (!dryRun) await payload.update({ collection: "posts", id: post.id, data: { ...(bodyChanged ? { cdsBody: data.cdsBody } : {}), ...(photoChanged ? { cds: photo } : {}) }, depth: 0 });
  }
  console.log({ cdsDocs: docs.length, changed, gainedPlayer, photoCaptionsOrCredits: captioned, notImported: missing, dryRun });
  await refreshNprCopies(payload);
}

/** NPR copies: same converter, but only the body (their photo fields belong to the NPR sync). Withdrawn copies stay empty. */
async function refreshNprCopies(payload: Awaited<ReturnType<typeof getPayload>>) {
  const { docs: copies } = await payload.find({ collection: "posts", where: { source: { equals: "npr" }, "cds.withdrawnAt": { exists: false } }, pagination: false, depth: 0, select: { title: true, cdsBody: true, cds: true } });
  const current = await nprDocsById(copies.flatMap((c) => (c.cds?.documentId ? [c.cds.documentId] : [])), token!);
  let changed = 0;
  for (const post of copies) {
    const doc = post.cds?.documentId ? current.get(post.cds.documentId) : undefined;
    if (!doc) continue; // the NPR sync withdraws copies NPR stopped serving
    const body = toPostData(doc).cdsBody;
    if (stable(post.cdsBody ?? []) === stable(body)) continue;
    changed++;
    console.log(`  NPR #${post.id} ${body.filter((b) => b.kind === "embed" || b.kind === "video").map((b) => b.kind).join(",") || "text"}: ${post.title.slice(0, 60)}`);
    if (!dryRun) await payload.update({ collection: "posts", id: post.id, data: { cdsBody: body }, depth: 0 });
  }
  console.log({ nprCopies: copies.length, nprChanged: changed, dryRun });
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
