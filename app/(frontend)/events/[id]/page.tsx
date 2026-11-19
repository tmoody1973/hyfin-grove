import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { PlayRow } from "@/components/listen/PlayRow";
import { StoryList } from "@/components/listen/StoryList";
import { formatConcertWhen } from "@/lib/events/calendar";
import { artistMatches, eventJsonLd, eventState, mergeLookups } from "@/lib/events/eventPage";
import { eventPath, safeTicketUrl } from "@/lib/events/links";
import { getConcert, getConcerts, type Concert } from "@/lib/events/rmEvents";
import { getPlays, type Play, type Result } from "@/lib/listen/rmPlaylist";
import { formatClock } from "@/lib/listen/time";
import { getPostsMentioning, type StoryLink } from "@/lib/posts";
import { SITE_URL } from "@/lib/seo";

/**
 * One event: the lookup gives status and details for any event (past ones too); the station list gives HYFIN's
 * view (the act it plays, play count, metro). Both run at once; either one alone is enough to show the page.
 */
const findConcert = cache(async (id: string): Promise<Result<Concert | null>> => {
  const [one, all] = await Promise.all([getConcert(id), getConcerts()]);
  return mergeLookups(one, all, id);
});

/** The artist's own plays and stories: whole-name matches only ("Tems" isn't "Systems"). Never fails the page. */
async function onHyfin(artist: string) {
  if (!artist.trim()) return { plays: [] as Play[], stories: [] as StoryLink[] };
  const [plays, stories] = await Promise.all([
    getPlays({ q: artist, limit: 30 }),
    getPostsMentioning(artist, 18).catch(() => [] as StoryLink[]),
  ]);
  return {
    plays: plays.ok ? plays.value.filter((p) => artistMatches(artist, p.artist)).slice(0, 10) : [],
    stories: stories.filter((s) => artistMatches(artist, s.title)).slice(0, 6),
  };
}

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

const LABEL = { passed: "This show has passed", cancelled: "Cancelled", postponed: "Postponed" } as const;

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const now = await requestTime();
  const found = await findConcert(id);
  if (!found.ok || !found.value) return { title: "Event", robots: { index: false } };
  const c = found.value;
  const when = formatConcertWhen(c).split(" · ")[0];
  return {
    title: `${c.title} · ${when}`,
    description: `${c.artist} at ${c.venue}, ${c.city}, ${when}.`,
    alternates: { canonical: eventPath(c.id) },
    openGraph: { type: "website", title: c.title, description: `${c.artist} at ${c.venue}, ${c.city}, ${when}.`, url: eventPath(c.id), ...(c.imageUrl ? { images: [c.imageUrl] } : {}) },
    robots: eventState(c, now) === "upcoming" ? undefined : { index: false },
  };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const now = await requestTime();
  const found = await findConcert(id);
  if (!found.ok) {
    return <p className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] py-20 text-ink-soft">This event is unavailable right now. Try again in a minute.</p>;
  }
  const c = found.value;
  if (!c) notFound();
  const state = eventState(c, now);
  const tickets = state === "upcoming" ? safeTicketUrl(c.ticketUrl) : null;
  const { plays, stories } = await onHyfin(c.artist);
  const jsonLd = JSON.stringify(eventJsonLd(c, `${SITE_URL}${eventPath(c.id)}`, now)).replace(/</g, "\\u003c");

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <p className="font-mono text-xs text-ink-soft">/events</p>
      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,420px)_1fr]">
        {c.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- event image from the ticket source
          <img src={c.imageUrl} alt="" width={420} height={420} className="aspect-square w-full border border-white object-cover" />
        ) : (
          <span aria-hidden="true" className="block aspect-square w-full border border-white bg-[#1a1a1a]" />
        )}
        <div className="min-w-0">
          {state !== "upcoming" && <p className="font-mono text-sm uppercase tracking-[0.12em] text-[#ff0040]">{LABEL[state]}</p>}
          <h1 className="mt-2 break-words font-display text-[clamp(40px,6vw,84px)] uppercase leading-[0.88] tracking-[-0.02em]">{c.title}</h1>
          <p className="mt-5 font-mono text-sm uppercase tracking-[0.08em] text-[#ff0040]">
            {formatConcertWhen(c)}
            {c.doorsAt ? ` · doors ${formatClock(c.doorsAt)}` : ""}
          </p>
          <p className="mt-2 text-lg">{c.venue}, {c.city}{c.region ? `, ${c.region}` : ""}</p>
          {(c.headliners.length > 0 || c.supports.length > 0) && (
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {c.headliners.length > 0 && (<><dt className="font-mono uppercase text-ink-soft">Headlining</dt><dd>{c.headliners.join(", ")}</dd></>)}
              {c.supports.length > 0 && (<><dt className="font-mono uppercase text-ink-soft">With</dt><dd>{c.supports.join(", ")}</dd></>)}
              {c.genre && (<><dt className="font-mono uppercase text-ink-soft">Genre</dt><dd>{c.genre}</dd></>)}
            </dl>
          )}
          {c.playCount !== null && c.playCount > 0 && (
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.1em] text-[#ff0040]">In rotation on HYFIN · {c.playCount} {c.playCount === 1 ? "play" : "plays"} in the last 30 days</p>
          )}
          {tickets && (
            <a href={tickets} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center bg-[#ff0040] px-6 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-black hover:bg-white">
              Get tickets
            </a>
          )}
        </div>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="plays-heading">
          <h2 id="plays-heading" className="border-b border-white pb-2 font-display text-3xl uppercase">{c.artist} on HYFIN</h2>
          {plays.length > 0 ? <ul>{plays.map((p) => <PlayRow key={p.id} play={{ ...p, liveEvent: null }} withDate />)}</ul> : <p className="py-6 text-ink-soft">No recent plays to show.</p>}
        </section>
        {stories.length > 0 && (
          <section aria-labelledby="stories-heading">
            <h2 id="stories-heading" className="border-b border-white pb-2 font-display text-3xl uppercase">Stories</h2>
            <StoryList stories={stories} />
          </section>
        )}
      </div>
    </div>
  );
}
