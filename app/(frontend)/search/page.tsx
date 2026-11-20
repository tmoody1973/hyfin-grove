import type { Metadata } from "next";
import config from "@payload-config";
import Link from "next/link";
import { after, connection } from "next/server";
import { getPayload } from "payload";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { getPostPage } from "@/lib/stories";
import { logQuery } from "@/lib/search/log";
import { KINDS, normalizeQuery, searchSite } from "@/lib/search/query";
import type { SearchKind } from "@/lib/search/rows";
import { searchSongs } from "@/lib/search/songs";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true }, alternates: { canonical: "/search" } };

const PER_PAGE = 20;
const CHIPS: Array<{ key: SearchKind | "song" | ""; label: string }> = [
  { key: "", label: "All" },
  { key: "story", label: "Stories" },
  { key: "show", label: "Shows" },
  { key: "host", label: "Hosts" },
  { key: "event", label: "Events" },
  { key: "song", label: "Songs" },
  { key: "page", label: "Pages" },
];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const dateLine = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
const chip = "inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] -ml-px";

/** Now, read per request (as the homepage does), so rendering stays pure. */
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

/** Site search (plan 12, decision 019): server-rendered, so it works without JavaScript and can be shared. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const raw = one(sp.q);
  const q = normalizeQuery(raw);
  const kindParam = one(sp.kind);
  const kind = (KINDS as readonly string[]).includes(kindParam) ? (kindParam as SearchKind) : null;
  const songsOnly = kindParam === "song";
  const page = Math.max(1, Math.min(50, Number.parseInt(one(sp.page), 10) || 1));
  const now = await requestTime();
  const payload = await getPayload({ config });

  const [result, songs, newest] = await Promise.all([
    q && !songsOnly ? searchSite(payload, { q, kind, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }) : Promise.resolve(null),
    q && (songsOnly || (!kind && page === 1)) ? searchSongs(q, now, songsOnly ? 30 : 6) : Promise.resolve([]),
    q ? Promise.resolve(null) : getPostPage(payload, { page: 1, perPage: 8 }),
  ]);
  if (q && page === 1) after(() => logQuery(payload, q, (result?.total ?? 0) + songs.length, kindParam || null));

  const href = (o: { kind?: string; page?: number }) => {
    const p = new URLSearchParams({ q: q ?? "" });
    if (o.kind) p.set("kind", o.kind);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    return `/search?${p}`;
  };
  const pages = result ? Math.ceil(result.total / PER_PAGE) : 0;

  return (
    <div className="mx-auto max-w-[1100px] px-[clamp(20px,4vw,60px)] pb-16 pt-10">
      <h1 className="sg-fx sg-lines m-0 font-display text-[clamp(44px,8vw,92px)] uppercase leading-[0.92] tracking-[-0.02em]">Search</h1>
      <form role="search" action="/search" className="mt-6 flex gap-3">
        <label htmlFor="search-q" className="sr-only">Search HYFIN</label>
        <input id="search-q" name="q" type="search" defaultValue={raw} maxLength={100} placeholder="Artists, shows, stories, events…" autoFocus={!q} className="h-14 min-w-0 flex-1 border border-white bg-black px-4 text-[19px] text-white focus:border-[#00ff9f] focus:outline-none" />
        {kindParam && <input type="hidden" name="kind" value={kindParam} />}
        <button type="submit" className="sg-btn h-14 bg-white px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">Search</button>
      </form>

      {q && (
        <nav aria-label="Kinds of result" className="mt-6 flex flex-wrap pl-px">
          {CHIPS.map((c) => (
            <Link key={c.label} href={href({ kind: c.key })} aria-current={(kindParam || "") === c.key ? "page" : undefined} className={`${chip} ${(kindParam || "") === c.key ? "bg-white text-black" : "hover:text-[#00ff9f]"}`}>
              {c.label}
            </Link>
          ))}
        </nav>
      )}

      {!q && raw.trim() && <p className="mt-6 text-ink-soft">Type at least two letters, or a word that isn&rsquo;t &ldquo;the&rdquo;.</p>}

      {result && (
        <section aria-labelledby="results" className="mt-8">
          <h2 id="results" role="status" className="m-0 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            {result.total === 0 ? `Nothing found for “${q}”` : `${result.total} result${result.total === 1 ? "" : "s"} for “${q}”`}
            {result.fuzzy ? " · including close matches" : ""}
          </h2>
          <ol className="m-0 mt-4 list-none p-0">
            {result.hits.map((h) => (
              <li key={h.id} className="border-b border-white/25 py-5">
                <Link href={h.href} className="group flex gap-4">
                  {h.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pictures from many hosts (NPR, ticket sites, Blob)
                    <img src={h.imageUrl} alt="" width={120} height={80} loading="lazy" className="hidden h-20 w-[120px] shrink-0 border border-white/40 object-cover sm:block" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="m-0 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                      {h.label}
                      {h.date ? ` · ${dateLine(h.date)}` : ""}
                    </p>
                    <p className="m-0 mt-1 text-[21px] font-semibold leading-tight group-hover:text-[#00ff9f]">{h.title}</p>
                    {/* Escaped on the server; only the <mark> around matched words is markup (lib/search/query.ts). */}
                    {h.snippet && <p className="search-snippet m-0 mt-1.5 text-[16px] leading-snug text-[#e6e6e6]" dangerouslySetInnerHTML={{ __html: h.snippet }} />}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
          {result.total === 0 && <p className="mt-4">Try an artist, a show, a DJ or a venue. Or <Link className="underline underline-offset-4" href="/listen/playlist">search the playlist</Link>.</p>}
          {pages > 1 && (
            <nav aria-label="Result pages" className="mt-8 flex gap-3 font-mono text-xs uppercase tracking-[0.1em]">
              {page > 1 && <Link className="inline-flex min-h-11 items-center border border-white px-4" href={href({ kind: kindParam, page: page - 1 })}>Previous</Link>}
              <span className="inline-flex min-h-11 items-center px-2 text-ink-soft">Page {page} of {pages}</span>
              {page < pages && <Link className="inline-flex min-h-11 items-center border border-white px-4" href={href({ kind: kindParam, page: page + 1 })}>Next</Link>}
            </nav>
          )}
        </section>
      )}

      {songs.length > 0 && (
        <section aria-labelledby="songs" className="mt-10 border-t border-white pt-6">
          <h2 id="songs" className="m-0 font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">Played on HYFIN · last 30 days</h2>
          <ul className="m-0 mt-3 list-none p-0">
            {songs.map((s) => (
              <li key={`${s.artist}-${s.title}`} className="border-b border-white/25">
                <Link href={s.href} className="flex min-h-14 items-center gap-3 py-2 hover:text-[#00ff9f]">
                  {s.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Apple's album art, served sized
                    <img src={s.artworkUrl} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 object-cover" />
                  ) : (
                    <span className="size-11 shrink-0 bg-[#1a1a1a]" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.title}</span>
                    <span className="block text-[15px] text-ink-soft">{s.artist} · {dateLine(s.lastPlayedAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {songsOnly && songs.length === 0 && <p className="mt-8">HYFIN hasn&rsquo;t played anything matching &ldquo;{q}&rdquo; in the last 30 days.</p>}

      {newest && (
        <section aria-labelledby="newest" className="mt-12">
          <h2 id="newest" className="m-0 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">Newest on HYFIN</h2>
          <div className="mt-6">
            <StoryGrid cards={newest.cards} page={1} totalPages={1} path="/search" />
          </div>
        </section>
      )}
    </div>
  );
}
