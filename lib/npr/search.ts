import type { CdsDocument } from "@/lib/cds/toPost";
import { acceptNprDoc, NPR_OWNER } from "./accept";
import { matchesKeywords, parseNprQuery } from "./query";
import { NPR_RACE_TOPIC } from "./topic";

/**
 * The admin's Add from NPR search (plan 11, task 3). CDS has no text search, so keywords scan NPR's newest stories
 * and match titles and teasers here (as Tarik's npr-cds MCP does); a pasted npr.org link is an exact lookup by path.
 * Every request goes to CDS and nowhere else; only acceptable NPR stories come back.
 */
export type NprResult = { id: string; title: string; teaser: string | null; url: string; imageUrl: string | null; publishedAt: string; collectionIds: string[] };

const CDS = "https://content.api.npr.org/v1/documents";
const NPR_MUSIC = "1039";
const SCAN_PAGES = 3; // 300 newest NPR stories for a keyword search
const PAGE = 100;
const MAX_RESULTS = 20;

const base = () => new URLSearchParams({ ownerHrefs: NPR_OWNER, profileIds: "story", excludedProfileIds: "has-premium-audio", sort: "publishDateTime:desc" });

async function get(params: URLSearchParams, token: string, fetchImpl: typeof fetch): Promise<CdsDocument[]> {
  const res = await fetchImpl(`${CDS}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CDS ${res.status}`);
  return ((await res.json()) as { resources?: CdsDocument[] }).resources ?? [];
}

const toResults = (docs: CdsDocument[]): NprResult[] =>
  docs.flatMap((doc) => {
    const d = acceptNprDoc(doc);
    return d ? [{ id: d.cdsId, title: d.title, teaser: d.excerpt, url: d.canonicalUrl!, imageUrl: d.imageUrl, publishedAt: d.publishedAt, collectionIds: d.collectionIds }] : [];
  });

const newestFirst = (rs: NprResult[]) => {
  const seen = new Set<string>();
  return rs.filter((r) => !seen.has(r.id) && seen.add(r.id)).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
};

export async function searchNpr(raw: string, { token, fetchImpl = fetch }: { token: string | undefined; fetchImpl?: typeof fetch }): Promise<NprResult[]> {
  if (!token) return [];
  const q = parseNprQuery(raw);
  try {
    if (q.kind === "path") return toResults(await get(new URLSearchParams({ nprWebsitePaths: q.path, limit: "5" }), token, fetchImpl));
    if (q.kind === "id") return toResults(await get(new URLSearchParams({ ids: q.id, limit: "1" }), token, fetchImpl));
    if (q.kind === "browse") {
      const lists = await Promise.all(
        [NPR_MUSIC, NPR_RACE_TOPIC].map((c) => {
          const p = base();
          p.set("collectionIds", c);
          p.set("limit", "12");
          return get(p, token, fetchImpl);
        }),
      );
      return newestFirst(lists.flatMap(toResults)).slice(0, MAX_RESULTS);
    }
    const found: NprResult[] = [];
    for (let page = 0; page < SCAN_PAGES && found.length < MAX_RESULTS; page++) {
      const p = base();
      p.set("limit", String(PAGE));
      p.set("offset", String(page * PAGE));
      const docs = await get(p, token, fetchImpl);
      found.push(...toResults(docs).filter((r) => matchesKeywords(r, q.words)));
      if (docs.length < PAGE) break;
    }
    return newestFirst(found).slice(0, MAX_RESULTS);
  } catch {
    return [];
  }
}
