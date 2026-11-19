/**
 * One CDS sync run: fetch HYFIN's stories, compare with Payload, apply the differences, record a heartbeat.
 * Runs inside the live server (cron route), so nothing here may import jsdom.
 */
import type { Payload } from "payload";
import { askJev } from "@/lib/sorting/jev";
import { buildSortQuestions, BODY_CHARS, interpretSort } from "@/lib/sorting/questions";
import { fetchBylineNames, fetchByIds, fetchScopedDocuments } from "./client";
import { cdsOwnedFields, planSync, slugFor, type StoredCds, type SyncPlan } from "./plan";
import { mapByCollections } from "./scope";
import { bylineDocumentIds, toPostData, type CdsPostData } from "./toPost";

export type SyncCounts = { fetched: number; created: number; updated: number; withdrawn: number; restored: number; failed: number; toReview: number };
type Env = { token: string; typesafeKey: string };
type Options = { now?: Date; dryRun?: boolean; log?: (line: string) => void; fetchImpl?: typeof fetch };

const STATUS = "cds-sync-status";

/** Plain text for Jev: tags stripped by pattern (no HTML parser in the live server). */
const plainText = (p: CdsPostData) =>
  p.cdsBody.flatMap((b) => (b.kind === "html" ? [b.html] : [])).join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, BODY_CHARS);

async function loadStored(payload: Payload): Promise<StoredCds[]> {
  const { docs } = await payload.find({
    collection: "posts",
    where: { "cds.documentId": { exists: true } },
    pagination: false,
    depth: 0,
    select: { cds: true },
  });
  return docs.flatMap((d) => (d.cds?.documentId ? [{
    postId: d.id,
    cdsId: d.cds.documentId,
    editorialLastModified: d.cds.editorialLastModified ?? null,
    withdrawnAt: d.cds.withdrawnAt ?? null,
  }] : []));
}

/** Category, show, tags and review flag for a new story: the series mapping, else Jev. */
async function siteFields(payload: Payload, p: CdsPostData, env: Env, showIds: Map<string, number>, tags: Array<{ id: number; slug: string; name: string }>, fetchImpl: typeof fetch) {
  const mapped = mapByCollections(p.collectionIds);
  if (mapped) {
    let showId = showIds.get(mapped.showSlug);
    if (showId === undefined) {
      const { docs } = await payload.find({ collection: "shows", where: { slug: { equals: mapped.showSlug } }, limit: 1, depth: 0 });
      showId = docs[0]?.id ?? (await payload.create({ collection: "shows", data: { name: mapped.showName, slug: mapped.showSlug } })).id;
      showIds.set(mapped.showSlug, showId);
    }
    return { category: mapped.category, show: showId, tags: [] as number[], sorting: { categoryConfidence: 1, needsReview: false, reasons: [] as "low-confidence"[] } };
  }
  const state = `Title: ${p.title}\nSummary: ${p.excerpt ?? ""}\nArticle: ${plainText(p)}`;
  const sort = interpretSort(await askJev(state, buildSortQuestions(tags), env.typesafeKey, fetchImpl), tags.map((t) => t.slug));
  return {
    category: sort.category,
    show: null,
    tags: tags.filter((t) => sort.tagSlugs.includes(t.slug)).map((t) => t.id),
    sorting: { categoryConfidence: sort.categoryConfidence, needsReview: sort.needsReview, reasons: sort.needsReview ? (["low-confidence"] as const).slice() : [] },
  };
}

/** A slug no other post uses: Radio Milwaukee's own, with the CDS number appended on a clash. */
async function freeSlug(payload: Payload, p: CdsPostData): Promise<string> {
  const slug = slugFor(p);
  const { totalDocs } = await payload.count({ collection: "posts", where: { slug: { equals: slug } } });
  return totalDocs === 0 ? slug : `${slug}-${p.cdsId.split("-").pop()}`;
}

async function apply(payload: Payload, plan: SyncPlan, env: Env, now: Date, log: (l: string) => void, fetchImpl: typeof fetch): Promise<Omit<SyncCounts, "fetched">> {
  const counts = { created: 0, updated: 0, withdrawn: 0, restored: 0, failed: 0, toReview: 0 };
  const attempt = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      counts.failed++;
      log(`failed ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  const showIds = new Map<string, number>();
  const tags = plan.create.length ? (await payload.find({ collection: "tags", limit: 500, depth: 0 })).docs : [];

  for (const p of plan.create) {
    await attempt(p.cdsId, async () => {
      const site = await siteFields(payload, p, env, showIds, tags, fetchImpl);
      await payload.create({
        collection: "posts",
        data: { ...cdsOwnedFields(p, now), ...site, slug: await freeSlug(payload, p), source: "cds" },
      });
      counts.created++;
      if (site.sorting.needsReview) counts.toReview++;
    });
  }
  for (const { postId, data } of plan.update) {
    await attempt(data.cdsId, async () => {
      await payload.update({ collection: "posts", id: postId, data: cdsOwnedFields(data, now) });
      counts.updated++;
    });
  }
  for (const { postId, data } of plan.restore) {
    await attempt(data.cdsId, async () => {
      const fields = cdsOwnedFields(data, now);
      await payload.update({ collection: "posts", id: postId, data: { ...fields, cds: { ...fields.cds, withdrawnAt: null } } });
      counts.restored++;
    });
  }
  for (const postId of plan.withdraw) {
    await attempt(`post ${postId}`, async () => {
      await payload.update({ collection: "posts", id: postId, data: { cds: { withdrawnAt: now.toISOString() } } });
      counts.withdrawn++;
    });
  }
  return counts;
}

export async function runCdsSync(payload: Payload, env: Env, opts: Options = {}): Promise<SyncCounts & { plan?: SyncPlan }> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? ((line: string) => payload.logger.info(`[cds-sync] ${line}`));
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const docs = await fetchScopedDocuments(env.token, fetchImpl);
    const names = await fetchBylineNames(env.token, docs.flatMap(bylineDocumentIds), fetchImpl);
    const remote = docs.map((d) => toPostData(d, names)).filter((p) => !p.premium);
    const stored = await loadStored(payload);
    const remoteIds = new Set(remote.map((r) => r.cdsId));
    const missing = stored.filter((s) => !s.withdrawnAt && !remoteIds.has(s.cdsId)).map((s) => s.cdsId);
    const plan = planSync(remote, stored, await fetchByIds(env.token, missing, fetchImpl));
    if (opts.dryRun) {
      return { fetched: remote.length, created: plan.create.length, updated: plan.update.length, withdrawn: plan.withdraw.length, restored: plan.restore.length, failed: 0, toReview: 0, plan };
    }
    const counts = { fetched: remote.length, ...(await apply(payload, plan, env, now, log, fetchImpl)) };
    await payload.updateGlobal({
      slug: STATUS,
      data: { lastRunAt: now.toISOString(), ...(counts.failed === 0 ? { lastSuccessAt: now.toISOString(), lastError: null } : { lastError: `${counts.failed} item(s) failed; see logs` }), lastCounts: counts },
    });
    log(JSON.stringify(counts));
    return counts;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!opts.dryRun) await payload.updateGlobal({ slug: STATUS, data: { lastRunAt: now.toISOString(), lastError: message.slice(0, 500) } });
    throw err;
  }
}
