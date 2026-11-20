/**
 * Ranked site search over the search plugin's rows (plan 12, decision 019): Postgres full-text search with English
 * stemming and accent folding, title > summary > body, upcoming events boosted, newest first among equals; typo
 * matches on titles fill in when full-text finds fewer than 3.
 */
import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { normalize } from "@/lib/npr/query";
import type { SearchKind } from "./rows";

export const KINDS: readonly SearchKind[] = ["story", "show", "host", "event", "page"];
export type SearchHit = { id: number; kind: SearchKind; title: string; href: string; label: string; date: string | null; imageUrl: string | null; snippet: string };
export type SearchResult = { hits: SearchHit[]; total: number; fuzzy: boolean };

// Markers the database puts around matched words; escaped text can never contain them.
export const HL_START = "⟦";
export const HL_END = "⟧";
const STOPWORDS = new Set(["a", "an", "and", "the", "of", "to", "in", "on", "for", "at", "by", "is", "it", "or", "with", "from", "this", "that"]);

/** What's worth searching: trimmed, at most 100 characters; null for empty, one-letter or stopword-only input. */
export function normalizeQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.replace(/\s+/g, " ").trim().slice(0, 100).trim();
  if (q.length < 2) return null;
  const words = normalize(q).split(/[^a-z0-9]+/).filter(Boolean);
  return words.length && !words.every((w) => STOPWORDS.has(w)) ? q : null;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** A snippet as HTML: everything escaped, then only balanced markers become <mark>. */
export function renderSnippet(raw: string | null | undefined): string {
  const html = escapeHtml(raw ?? "").replace(new RegExp(`${HL_START}([^${HL_START}${HL_END}]*)${HL_END}`, "g"), "<mark>$1</mark>");
  return html.replace(new RegExp(`[${HL_START}${HL_END}]`, "g"), "");
}

type Row = { id: number; kind: SearchKind; title: string; href: string; label: string | null; date: string | Date | null; image_url: string | null; snippet: string | null; total?: string | number };
type Exec = { execute: (q: unknown) => Promise<{ rows: Row[] }> };
const drizzle = (payload: Pick<Payload, "db">) => (payload.db as unknown as { drizzle: Exec }).drizzle;

const toHit = (r: Row): SearchHit => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  href: r.href,
  label: r.label ?? "",
  date: r.date ? new Date(r.date).toISOString() : null,
  imageUrl: r.image_url,
  snippet: renderSnippet(r.snippet),
});

export async function searchSite(payload: Pick<Payload, "db">, opts: { q: string; kind?: SearchKind | null; limit?: number; offset?: number }): Promise<SearchResult> {
  const db = drizzle(payload);
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  const kind = opts.kind && KINDS.includes(opts.kind) ? sql`AND kind = ${opts.kind}` : sql``;
  const headline = `StartSel=${HL_START}, StopSel=${HL_END}, MaxFragments=1, MaxWords=30, MinWords=12, FragmentDelimiter=" … "`;
  const { rows } = await db.execute(sql`
    WITH q AS (SELECT websearch_to_tsquery('public.hyfin'::regconfig, ${opts.q}) AS tsq)
    SELECT id, kind, title, href, label, date, image_url,
      ts_headline('public.hyfin'::regconfig, concat_ws(' ', nullif(excerpt, ''), left(body, 4000)), q.tsq, ${headline}) AS snippet,
      count(*) OVER () AS total
    FROM search, q
    WHERE visible AND fts @@ q.tsq ${kind}
    ORDER BY ts_rank_cd(fts, q.tsq) * (CASE WHEN kind = 'event' AND date >= now() THEN 1.5 ELSE 1 END) DESC, date DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}`);
  const total = Number(rows[0]?.total ?? 0);
  if (total >= 3 || offset > 0) return { hits: rows.map(toHit), total, fuzzy: false };

  // Fewer than 3: typo matches on titles ("kendirck lamar" → "Kendrick Lamar…") fill in after the real ones.
  const seen = rows.map((r) => r.id);
  const { rows: close } = await db.execute(sql`
    SELECT id, kind, title, href, label, date, image_url, left(coalesce(nullif(excerpt, ''), body, ''), 200) AS snippet
    FROM search
    WHERE visible ${kind}
      AND word_similarity(public.hyfin_unaccent(lower(${opts.q})), public.hyfin_unaccent(lower(title))) > 0.45
      ${seen.length ? sql`AND id NOT IN (${sql.join(seen.map((id) => sql`${id}`), sql`, `)})` : sql``}
    ORDER BY word_similarity(public.hyfin_unaccent(lower(${opts.q})), public.hyfin_unaccent(lower(title))) DESC, date DESC NULLS LAST
    LIMIT ${limit - rows.length}`);
  return { hits: [...rows.map(toHit), ...close.map(toHit)], total: total + close.length, fuzzy: close.length > 0 };
}
