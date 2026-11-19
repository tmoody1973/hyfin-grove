import { toPostData, type CdsDocument } from "@/lib/cds/toPost";

/**
 * NPR's own stories for one topic, read live from CDS (decision 010). CDS marks them "display-only: attribute
 * via url, refresh regularly, do not store beyond display", so they are never written to Payload, cached at most
 * 15 minutes, and every item links to its npr.org page.
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
