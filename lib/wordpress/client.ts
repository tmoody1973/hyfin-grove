import type { WpMedia, WpPost } from "./types";

const BASE = "https://hyfin.org/wp-json/wp/v2";
const POST_FIELDS = "id,date,date_gmt,slug,link,title,excerpt,content,categories,tags,featured_media,author";

export const WP_TIMEOUT_MS = 30_000;
/** Statuses that mean "not there for us" (missing, or attached to something unpublished): treat as absent. */
const ABSENT = new Set([401, 403, 404, 410]);

async function getJson<T>(url: string, fetchImpl: typeof fetch, timeoutMs = WP_TIMEOUT_MS): Promise<{ body: T; totalPages: number } | null> {
  const res = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  if (ABSENT.has(res.status)) return null;
  if (!res.ok) throw new Error(`WordPress request failed: HTTP ${res.status} for ${url}`);
  return { body: (await res.json()) as T, totalPages: Number(res.headers.get("x-wp-totalpages") ?? "1") };
}

export async function fetchPostBySlug(slug: string, fetchImpl: typeof fetch = fetch): Promise<WpPost | null> {
  const r = await getJson<WpPost[]>(`${BASE}/posts?slug=${encodeURIComponent(slug)}&_fields=${POST_FIELDS}`, fetchImpl);
  return r?.body[0] ?? null;
}

export async function fetchMedia(id: number, fetchImpl: typeof fetch = fetch, timeoutMs = WP_TIMEOUT_MS): Promise<WpMedia | null> {
  const r = await getJson<WpMedia>(`${BASE}/media/${id}?_fields=id,source_url,alt_text,mime_type`, fetchImpl, timeoutMs);
  return r?.body ?? null;
}

/** Every post, oldest page last, 100 per request. */
export async function* fetchAllPosts(fetchImpl: typeof fetch = fetch): AsyncGenerator<WpPost> {
  for (let page = 1, total = 1; page <= total; page++) {
    const r = await getJson<WpPost[]>(`${BASE}/posts?per_page=100&page=${page}&_fields=${POST_FIELDS}`, fetchImpl);
    // A missing page mid-walk would make totals look complete when they aren't.
    if (!r) throw new Error(`WordPress posts page ${page} of ${total} is unavailable`);
    total = r.totalPages;
    yield* r.body;
  }
}
