import { HYFIN_OWNER, isWordPressCopy, SCOPE_COLLECTION_IDS } from "./scope";
import type { CdsDocument } from "./toPost";

const CDS_BASE = "https://content.api.npr.org/v1/documents";
const PAGE = 100;
const MAX_OFFSET = 2000; // CDS refuses offset + limit beyond this
const ID_BATCH = 50; // an ids query still pages: without limit, CDS returns only 20
const PREMIUM_PROFILE = "/v1/profiles/has-premium-audio";

async function cdsGet(params: URLSearchParams, token: string, fetchImpl: typeof fetch): Promise<CdsDocument[]> {
  const res = await fetchImpl(`${CDS_BASE}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`CDS request failed: ${res.status} ${res.statusText}`);
  return ((await res.json()) as { resources?: CdsDocument[] }).resources ?? [];
}

/** Every Radio Milwaukee story in the HYFIN tag or a HYFIN series, minus premium items and WordPress copies. */
export async function fetchScopedDocuments(token: string, fetchImpl: typeof fetch = fetch): Promise<CdsDocument[]> {
  const docs: CdsDocument[] = [];
  for (let offset = 0; offset + PAGE <= MAX_OFFSET; offset += PAGE) {
    const params = new URLSearchParams({
      ownerHrefs: HYFIN_OWNER,
      collectionIds: SCOPE_COLLECTION_IDS.join(","), // comma list = any of these
      profileIds: "story",
      excludedProfileIds: "has-premium-audio",
      sort: "publishDateTime:desc",
      limit: String(PAGE),
      offset: String(offset),
    });
    const page = await cdsGet(params, token, fetchImpl);
    docs.push(...page.filter((d) => !isWordPressCopy(d.id)));
    if (page.length < PAGE) break;
  }
  return docs;
}

/** Which of these ids CDS still returns as non-premium (anything else must come down). */
export async function fetchByIds(token: string, ids: string[], fetchImpl: typeof fetch = fetch): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const page = await cdsGet(new URLSearchParams({ ids: ids.slice(i, i + ID_BATCH).join(","), limit: String(ID_BATCH) }), token, fetchImpl);
    for (const d of page) if (!d.profiles?.some((p) => p.href === PREMIUM_PROFILE)) found.add(d.id);
  }
  return found;
}

/** Biography document id → person's name, for bylines. */
export async function fetchBylineNames(token: string, ids: string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += ID_BATCH) {
    const page = await cdsGet(new URLSearchParams({ ids: unique.slice(i, i + ID_BATCH).join(","), limit: String(ID_BATCH) }), token, fetchImpl);
    for (const d of page) if (d.title) names.set(d.id, d.title);
  }
  return names;
}
