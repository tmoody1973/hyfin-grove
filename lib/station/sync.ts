import type { Payload } from "payload";
import type { Post } from "@/payload-types";
import { HYFIN_OWNER } from "../cds/scope";
import { sanitizeHtml, toPostData, type BodyBlock, type CdsDocument } from "../cds/toPost";
import { canonicalSlug } from "../legacy";
import type { FeedEpisode } from "./feed";

/** The episode's podcast-feed copy in CDS: the full description and the audio (decision 009). */
export type StationCopy = { id: string; html: string; audioUrl: string | null; durationSeconds: number | null };
export type StationCounts = { fetched: number; created: number; updated: number; unchanged: number; withoutAudio: number; failed: number };
type Deps = { fetchFeed: () => Promise<FeedEpisode[]>; findCopy: (ep: FeedEpisode) => Promise<StationCopy | null>; log?: (line: string) => void };

const SHOW = { slug: "uniquely-milwaukee", name: "Uniquely Milwaukee" };
const UM_PODCAST = "718414860";
const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Postgres jsonb re-sorts object keys, so compare with keys sorted.
const stable = (v: unknown): string =>
  JSON.stringify(v ?? null, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/** Fields the station site and CDS own; category, tags and show stay the editor's after import. */
function syncedFields(ep: FeedEpisode, copy: StationCopy | null, existing: Post | undefined) {
  const body: BodyBlock[] = copy
    ? [{ kind: "html", id: copy.id, html: sanitizeHtml(copy.html) }]
    : ((existing?.cdsBody as BodyBlock[] | undefined) ?? [{ kind: "html", id: ep.url, html: ep.summary ? `<p>${escapeText(ep.summary)}</p>` : "" }]);
  const audio = copy?.audioUrl ? { url: copy.audioUrl, durationSeconds: copy.durationSeconds } : existing?.audio?.url ? existing.audio : undefined;
  return {
    title: ep.title,
    excerpt: ep.summary,
    byline: ep.author,
    publishedAt: ep.publishedAt,
    cds: { imageUrl: ep.imageUrl },
    cdsBody: body,
    ...(audio ? { audio } : {}),
    station: { url: ep.url, cdsCopyId: copy?.id ?? existing?.station?.cdsCopyId ?? null },
  };
}

const isGroup = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** The stored values for exactly the keys `shape` sets, recursing into groups (Payload returns every group field, often null). */
const pickLike = (stored: unknown, shape: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(shape).map(([k, v]) => {
    const s = isGroup(stored) ? stored[k] : undefined;
    return [k, isGroup(v) && k !== "cdsBody" ? pickLike(s, v) : s];
  }));

async function showId(payload: Payload): Promise<number> {
  const { docs } = await payload.find({ collection: "shows", where: { slug: { equals: SHOW.slug } }, limit: 1, depth: 0 });
  return docs[0]?.id ?? (await payload.create({ collection: "shows", data: SHOW })).id;
}

async function freeSlug(payload: Payload, url: string): Promise<string> {
  const slug = canonicalSlug(url.split("/").filter(Boolean).pop() ?? "uniquely-milwaukee");
  const { totalDocs } = await payload.count({ collection: "posts", where: { slug: { equals: slug } } });
  return totalDocs === 0 ? slug : `${slug}-um`;
}

/** Import HYFIN-tagged Uniquely Milwaukee episodes from the station feed. One failing episode never stops the rest. */
export async function syncStation(payload: Payload, deps: Deps): Promise<StationCounts> {
  const log = deps.log ?? (() => {});
  const episodes = await deps.fetchFeed();
  const counts: StationCounts = { fetched: episodes.length, created: 0, updated: 0, unchanged: 0, withoutAudio: 0, failed: 0 };
  let show: number | undefined;
  for (const ep of episodes) {
    try {
      const copy = await deps.findCopy(ep).catch((err: unknown) => {
        log(`CDS copy lookup failed for ${ep.url}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      });
      const existing = (await payload.find({ collection: "posts", where: { "station.url": { equals: ep.url } }, limit: 1, depth: 0 })).docs[0];
      const fields = syncedFields(ep, copy, existing);
      if (!fields.audio) counts.withoutAudio++;
      if (!existing) {
        show ??= await showId(payload);
        await payload.create({ collection: "posts", data: { ...fields, category: "milwaukee", show, tags: [], source: "station", slug: await freeSlug(payload, ep.url) } });
        counts.created++;
      } else if (stable(pickLike(existing, fields)) !== stable(fields)) {
        await payload.update({ collection: "posts", id: existing.id, data: fields });
        counts.updated++;
      } else counts.unchanged++;
    } catch (err) {
      counts.failed++;
      log(`failed ${ep.url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return counts;
}

const normTitle = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

/** Find the episode's copy from the Uniquely Milwaukee podcast feed in CDS: same title, published within 2 days. */
export async function findCdsCopy(ep: FeedEpisode, token: string, fetchImpl: typeof fetch = fetch): Promise<StationCopy | null> {
  const day = 86_400_000;
  const t = new Date(ep.publishedAt).getTime();
  const params = new URLSearchParams({
    collectionIds: UM_PODCAST,
    ownerHrefs: HYFIN_OWNER,
    publishDateTime: `${new Date(t - 2 * day).toISOString()}...${new Date(t + 2 * day).toISOString()}`,
    limit: "20",
  });
  const res = await fetchImpl(`https://content.api.npr.org/v1/documents?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CDS ${res.status}`);
  const docs = ((await res.json()) as { resources?: CdsDocument[] }).resources ?? [];
  const doc = docs.find((d) => normTitle(d.title) === normTitle(ep.title));
  if (!doc) return null;
  const data = toPostData(doc);
  return { id: doc.id, html: data.excerpt ?? "", audioUrl: data.audio?.url ?? null, durationSeconds: data.audio?.durationSeconds ?? null };
}
