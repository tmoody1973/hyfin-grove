/**
 * NPR's own stories as self-refreshing copies in Payload (plan 11, decision 015). Runs in the 15-minute cron:
 * creates the newest Race stories in Culture, refreshes every NPR copy, withdraws one NPR stops serving, deletes
 * Race copies nobody picked 30 days after publishing, and hides copies it couldn't confirm for 24 hours.
 * Runs inside the live server, so nothing here may import jsdom.
 */
import type { Payload } from "payload";
import { cdsOwnedFields } from "@/lib/cds/plan";
import { bylineDocumentIds, type CdsDocument, type CdsPostData } from "@/lib/cds/toPost";
import { acceptNprDoc, NPR_OWNER } from "./accept";
import { planNprSync, type StoredNpr } from "./plan";
import { NPR_RACE_TOPIC } from "./topic";

const CDS = "https://content.api.npr.org/v1/documents";
const RACE_INTAKE = 4; // the newest Race stories each run, as many as the site showed live before (decision 010)
const ID_BATCH = 50;
const STALE_MS = 24 * 3_600_000;

export type NprSyncCounts = { race: number; created: number; updated: number; withdrawn: number; restored: number; expired: number; checked: number; failed: number; staleHidden?: number; error?: string };

async function cdsDocs(params: URLSearchParams, token: string, fetchImpl: typeof fetch): Promise<CdsDocument[]> {
  const res = await fetchImpl(`${CDS}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CDS ${res.status}`);
  return ((await res.json()) as { resources?: CdsDocument[] }).resources ?? [];
}

/** Documents by id (CDS pages ids queries, so ask in batches with an explicit limit). */
export async function nprDocsById(ids: string[], token: string, fetchImpl: typeof fetch = fetch): Promise<Map<string, CdsDocument>> {
  const out = new Map<string, CdsDocument>();
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const batch = ids.slice(i, i + ID_BATCH);
    for (const d of await cdsDocs(new URLSearchParams({ ids: batch.join(","), limit: String(batch.length) }), token, fetchImpl)) out.set(d.id, d);
  }
  return out;
}

/** Byline names for these documents (biography id → name). */
export async function nprBylineNames(docs: CdsDocument[], token: string, fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> {
  const ids = [...new Set(docs.flatMap(bylineDocumentIds))];
  const people = await nprDocsById(ids, token, fetchImpl);
  return new Map([...people.values()].flatMap((p) => (p.title ? [[p.id, p.title] as [string, string]] : [])));
}

/** Fields for a new NPR copy: NPR's own (locked), plus HYFIN's section and where it came from. */
export const newNprPost = (d: CdsPostData, now: Date, extra: { category: "music" | "culture" | "milwaukee"; origin: "race" | "picked"; pickedBy?: number }) => ({
  ...cdsOwnedFields(d, now),
  category: extra.category,
  slug: `npr-${d.cdsId}`,
  source: "npr" as const,
  npr: { origin: extra.origin, pickedBy: extra.pickedBy ?? null, pickedAt: extra.origin === "picked" ? now.toISOString() : null },
  sorting: { categoryConfidence: 1, needsReview: false, reasons: [] },
});

async function loadStored(payload: Payload): Promise<Array<StoredNpr & { lastCheckedAt: string | null }>> {
  const { docs } = await payload.find({ collection: "posts", where: { source: { equals: "npr" } }, pagination: false, depth: 0, select: { cds: true, npr: true, publishedAt: true } });
  return docs.flatMap((d) =>
    d.cds?.documentId
      ? [{
          postId: d.id,
          cdsId: d.cds.documentId,
          origin: d.npr?.origin === "picked" ? ("picked" as const) : ("race" as const),
          publishedAt: d.publishedAt,
          editorialLastModified: d.cds.editorialLastModified ?? null,
          withdrawnAt: d.cds.withdrawnAt ?? null,
          lastCheckedAt: d.cds.lastCheckedAt ?? null,
        }]
      : [],
  );
}

/** CDS couldn't be reached: hide copies nobody could confirm for 24 hours (they come back on the next good run). */
async function hideStale(payload: Payload, stored: Array<StoredNpr & { lastCheckedAt: string | null }>, now: Date): Promise<number> {
  const stale = stored.filter((s) => !s.withdrawnAt && (!s.lastCheckedAt || now.getTime() - Date.parse(s.lastCheckedAt) > STALE_MS));
  for (const s of stale) await payload.update({ collection: "posts", id: s.postId, data: { cds: { withdrawnAt: now.toISOString() } } as never });
  return stale.length;
}

export async function runNprSync(payload: Payload, opts: { token: string; now?: Date; fetchImpl?: typeof fetch; log?: (line: string) => void }): Promise<NprSyncCounts> {
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const log = opts.log ?? ((l: string) => payload.logger.warn(`[npr-sync] ${l}`));
  const counts: NprSyncCounts = { race: 0, created: 0, updated: 0, withdrawn: 0, restored: 0, expired: 0, checked: 0, failed: 0 };
  const stored = await loadStored(payload);

  let raceDocs: CdsDocument[];
  let current: Map<string, CdsDocument>;
  let names: Map<string, string>;
  try {
    raceDocs = await cdsDocs(
      new URLSearchParams({ collectionIds: NPR_RACE_TOPIC, ownerHrefs: NPR_OWNER, profileIds: "story", excludedProfileIds: "has-premium-audio", sort: "publishDateTime:desc", limit: String(RACE_INTAKE + 4) }),
      opts.token,
      fetchImpl,
    );
    current = await nprDocsById(stored.map((s) => s.cdsId), opts.token, fetchImpl);
    names = await nprBylineNames([...raceDocs, ...current.values()], opts.token, fetchImpl);
  } catch (err) {
    counts.error = (err instanceof Error ? err.message : String(err)).slice(0, 200);
    counts.staleHidden = await hideStale(payload, stored, now);
    log(`CDS unreachable (${counts.error}); hid ${counts.staleHidden} copies unconfirmed for 24 h`);
    return counts;
  }

  const race = raceDocs.flatMap((d) => acceptNprDoc(d, names) ?? []).slice(0, RACE_INTAKE);
  counts.race = race.length;
  // Every stored copy got an answer: the story, or null when CDS no longer serves it as an acceptable NPR story.
  const answers = new Map(stored.map((s) => [s.cdsId, current.has(s.cdsId) ? acceptNprDoc(current.get(s.cdsId)!, names) : null] as const));
  const plan = planNprSync({ race, stored, current: answers, now });

  const attempt = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      return true;
    } catch (err) {
      counts.failed++;
      log(`failed ${label}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };
  for (const d of plan.create) {
    if (await attempt(d.cdsId, () => payload.create({ collection: "posts", data: newNprPost(d, now, { category: "culture", origin: "race" }) as never }))) counts.created++;
  }
  for (const { postId, data } of plan.update) {
    if (await attempt(data.cdsId, () => payload.update({ collection: "posts", id: postId, data: cdsOwnedFields(data, now) as never }))) counts.updated++;
  }
  for (const { postId, data } of plan.restore) {
    const fields = cdsOwnedFields(data, now);
    if (await attempt(data.cdsId, () => payload.update({ collection: "posts", id: postId, data: { ...fields, cds: { ...fields.cds, withdrawnAt: null } } as never }))) counts.restored++;
  }
  // Withdrawn: hidden, and NPR's text cleared ("do not store beyond display").
  for (const postId of plan.withdraw) {
    if (await attempt(`post ${postId}`, () => payload.update({ collection: "posts", id: postId, data: { cdsBody: [], audio: { url: null, durationSeconds: null }, cds: { withdrawnAt: now.toISOString() } } as never }))) counts.withdrawn++;
  }
  for (const postId of plan.expire) {
    if (await attempt(`post ${postId}`, () => payload.delete({ collection: "posts", id: postId }))) counts.expired++;
  }
  // Every other copy CDS confirmed: note when, so the 24-hour stale check knows it's current.
  const touched = new Set([...plan.update.map((u) => u.postId), ...plan.restore.map((r) => r.postId), ...plan.withdraw, ...plan.expire]);
  const confirmed = stored.filter((s) => !touched.has(s.postId) && answers.get(s.cdsId)).map((s) => s.postId);
  if (confirmed.length) {
    await attempt("lastCheckedAt", () => payload.update({ collection: "posts", where: { id: { in: confirmed } }, data: { cds: { lastCheckedAt: now.toISOString() } } as never }));
  }
  counts.checked = confirmed.length;
  return counts;
}
