/** Decide what a sync run changes. Pure, so every rule here is tested without CDS or a database. */
import { slugify } from "@/lib/taxonomy";
import type { CdsPostData } from "./toPost";

export type StoredCds = { postId: number; cdsId: string; editorialLastModified: string | null; withdrawnAt: string | null; byline: string | null };
export type SyncPlan = {
  create: CdsPostData[];
  update: Array<{ postId: number; data: CdsPostData }>;
  withdraw: number[];
  restore: Array<{ postId: number; data: CdsPostData }>;
};

const newer = (a: string, b: string | null) => b === null || Date.parse(a) > Date.parse(b);

/**
 * `remote`: what CDS returns for HYFIN now. `stored`: synced posts in Payload.
 * `stillPresent`: stored ids missing from `remote` that CDS still returns by id (left the HYFIN
 * collections, not withdrawn, so they stay up).
 */
export function planSync(remote: CdsPostData[], stored: StoredCds[], stillPresent: ReadonlySet<string>): SyncPlan {
  if (remote.length === 0 && stored.some((s) => !s.withdrawnAt)) {
    // An expired token or a silently broken filter looks exactly like this; never hide everything.
    throw new Error("CDS returned no stories");
  }
  const byId = new Map(stored.map((s) => [s.cdsId, s]));
  const remoteIds = new Set(remote.map((r) => r.cdsId));
  const plan: SyncPlan = { create: [], update: [], withdraw: [], restore: [] };
  for (const data of remote) {
    const s = byId.get(data.cdsId);
    if (!s) plan.create.push(data);
    else if (s.withdrawnAt) plan.restore.push({ postId: s.postId, data });
    // A byline can change without a CDS edit (a biography fixed or named in KNOWN_BIOGRAPHIES).
    else if (newer(data.editorialLastModified, s.editorialLastModified) || (data.byline ?? null) !== s.byline) plan.update.push({ postId: s.postId, data });
  }
  for (const s of stored) {
    if (!s.withdrawnAt && !remoteIds.has(s.cdsId) && !stillPresent.has(s.cdsId)) plan.withdraw.push(s.postId);
  }
  return plan;
}

/** Fields CDS owns. Never category, tags, show, sorting or slug: those are the editor's after creation. */
export const cdsOwnedFields = (p: CdsPostData, now: Date) => ({
  title: p.title,
  excerpt: p.excerpt,
  publishedAt: p.publishedAt,
  byline: p.byline,
  audio: { url: p.audio?.url ?? null, durationSeconds: p.audio?.durationSeconds ?? null },
  cdsBody: p.cdsBody,
  cds: {
    documentId: p.cdsId,
    canonicalUrl: p.canonicalUrl,
    imageUrl: p.imageUrl,
    imageCaption: p.imageCaption,
    imageCredit: p.imageCredit,
    imageAlt: p.imageAlt,
    editorialLastModified: p.editorialLastModified,
    lastCheckedAt: now.toISOString(),
  },
});

/** The slug Radio Milwaukee chose for the story's own page, else one made from the title. */
export function slugFor(p: CdsPostData): string {
  const fromPage = p.canonicalUrl ? new URL(p.canonicalUrl).pathname.split("/").filter(Boolean).pop() : undefined;
  return slugify(fromPage ?? p.title);
}
