import { bylineDocumentIds, toPostData, type BodyBlock, type CdsDocument } from "@/lib/cds/toPost";
import type { Card } from "@/lib/stories";

/**
 * NPR's own stories, read live from CDS (decision 010). CDS marks them "display-only: attribute via url, refresh
 * regularly, do not store beyond display": they are shown on HYFIN (/npr/<id>) but never written to Payload,
 * cached at most 15 minutes, credited to NPR, with npr.org as the canonical address.
 */
export type NprItem = { id: string; title: string; teaser: string | null; url: string; imageUrl: string | null; publishedAt: string };

export const NPR_RACE_TOPIC = "1015";
const NPR_OWNER = "https://organization.api.npr.org/v4/services/s1";
const REVALIDATE_SECONDS = 900;
const TIMEOUT_MS = 4000;

export function toNprItems(docs: CdsDocument[]): NprItem[] {
  return docs.flatMap((doc) => {
    const d = toPostData(doc);
    if (!d.canonicalUrl?.startsWith("https://www.npr.org/")) return [];
    return [{ id: doc.id, title: d.title, teaser: d.excerpt, url: d.canonicalUrl, imageUrl: d.imageUrl, publishedAt: d.publishedAt }];
  });
}

/** The newest stories in an NPR topic; [] on any failure, so the page never depends on CDS answering. */
export async function getNprTopic(topicId: string, limit: number, fetchImpl: typeof fetch = fetch, token = process.env.NPR_CDS_TOKEN): Promise<NprItem[]> {
  if (!token) return [];
  const params = new URLSearchParams({ collectionIds: topicId, ownerHrefs: NPR_OWNER, profileIds: "story", sort: "publishDateTime:desc", limit: String(limit + 4) });
  try {
    const res = await fetchImpl(`https://content.api.npr.org/v1/documents?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    } as RequestInit);
    if (!res.ok) return [];
    const docs = ((await res.json()) as { resources?: CdsDocument[] }).resources ?? [];
    return toNprItems(docs).slice(0, limit);
  } catch {
    return [];
  }
}

/** An NPR item as a story card; it opens on HYFIN. Negative ids so React keys never clash with post ids. */
export const nprCard = (item: NprItem, i: number): Card => ({
  id: -(i + 1),
  title: item.title,
  href: `/npr/${encodeURIComponent(item.id)}`,
  excerpt: item.teaser,
  byline: null,
  publishedAt: item.publishedAt,
  imageUrl: item.imageUrl,
  imageAlt: "",
  label: "NPR",
});

export type NprStory = {
  id: string;
  title: string;
  teaser: string | null;
  byline: string | null;
  publishedAt: string;
  imageUrl: string | null;
  imageCaption: string | null;
  imageCredit: string | null;
  imageAlt: string | null;
  body: BodyBlock[];
  audio: { url: string; durationSeconds: number | null } | null;
  canonicalUrl: string;
};

const NPR_ID = /^[a-z0-9][a-z0-9-]{2,63}$/i;

async function cdsDocs(params: URLSearchParams, token: string, fetchImpl: typeof fetch): Promise<CdsDocument[]> {
  const res = await fetchImpl(`https://content.api.npr.org/v1/documents?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  } as RequestInit);
  if (!res.ok) throw new Error(`CDS ${res.status}`);
  return ((await res.json()) as { resources?: CdsDocument[] }).resources ?? [];
}

/**
 * One NPR-owned story for its HYFIN page, or null. Only NPR's own (owner s1), non-premium stories with an npr.org
 * original are served, so other stations' content can't be shown through our address.
 */
export async function getNprStory(id: string, fetchImpl: typeof fetch = fetch, token = process.env.NPR_CDS_TOKEN): Promise<NprStory | null> {
  if (!token || !NPR_ID.test(id)) return null;
  try {
    const [doc] = await cdsDocs(new URLSearchParams({ ids: id, limit: "1" }), token, fetchImpl);
    if (!doc || doc.id !== id) return null;
    const owners = (doc as { owners?: Array<{ href: string }> }).owners ?? [];
    if (!owners.some((o) => o.href === NPR_OWNER)) return null;
    const bylineIds = bylineDocumentIds(doc);
    const names = new Map<string, string>();
    if (bylineIds.length) {
      const people = await cdsDocs(new URLSearchParams({ ids: bylineIds.join(","), limit: String(bylineIds.length) }), token, fetchImpl).catch(() => []);
      for (const p of people) if (p.title) names.set(p.id, p.title);
    }
    const d = toPostData(doc, names);
    if (d.premium || !d.canonicalUrl?.startsWith("https://www.npr.org/")) return null;
    return {
      id: doc.id,
      title: d.title,
      teaser: d.excerpt,
      byline: d.byline,
      publishedAt: d.publishedAt,
      imageUrl: d.imageUrl,
      imageCaption: d.imageCaption,
      imageCredit: d.imageCredit,
      imageAlt: d.imageAlt,
      body: d.cdsBody,
      audio: d.audio?.url ? { url: d.audio.url, durationSeconds: d.audio.durationSeconds ?? null } : null,
      canonicalUrl: d.canonicalUrl,
    };
  } catch {
    return null;
  }
}
