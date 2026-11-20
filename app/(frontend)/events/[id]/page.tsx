import { legacyOr404 } from "@/lib/legacy/legacyOr404";
import { ShareButton } from "@/components/pwa/ShareButton";
import type { Metadata } from "next";

import config from "@payload-config";
import { getPayload } from "payload";
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
import { eventBySlug, type EventFull } from "@/lib/events/store";
import { RichBody } from "@/components/story/RichBody";

/**
 * One event: the lookup gives status and details for any event (past ones too); the station list gives HYFIN's
 * view (the act it plays, play count, metro). Both run at once; either one alone is enough to show the page.
 */
const findConcert = cache(async (id: string): Promise<Result<Concert | null>> => {
  const [one, all] = await Promise.all([getConcert(id), getConcerts()]);
  return mergeLookups(one, all, id);
});

type Found = { kind: "stored"; full: EventFull } | { kind: "live"; concert: Concert } | { kind: "unavailable" } | { kind: "none" };

/**
 * Plan 9: the Events collection first. A concert not stored yet still renders live from rm-playlist, but an event
 * staff hid (or a draft) never does: if the address exists in Payload at all, Payload decides.
 */
const findEvent = cache(async (id: string): Promise<Found> => {
  const db = await getPayload({ config });
  const full = await eventBySlug(db, id);
  if (full) return { kind: "stored", full };
  const { totalDocs } = await db.count({ collection: "events", where: { slug: { equals: id } } });
  if (totalDocs > 0) return { kind: "none" };
  const live = await findConcert(id);
  if (!live.ok) return { kind: "unavailable" };
  return live.value ? { kind: "live", concert: live.value } : { kind: "none" };
});

const eventOf = (f: Found): (Concert & { type?: string; typeLabel?: string; endsAtMs?: number | null }) | null =>
  f.kind === "stored" ? f.full.view : f.kind === "live" ? f.concert : null;

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
const labelFor = (state: keyof typeof LABEL, type?: string) => (state === "passed" && type && type !== "concert" ? "This event has passed" : LABEL[state]);

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const now = await requestTime();
  const c = eventOf(await findEvent(id));
  if (!c) return { title: "Event", robots: { index: false } };
  const when = formatConcertWhen(c).split(" · ")[0];
  const where = [c.venue, c.city].filter(Boolean).join(", ");
  const description = `${c.artist || c.typeLabel || "Event"}${where ? ` at ${where}` : ""}, ${when}.`;
  return {
    title: `${c.title} · ${when}`,
    description,
    alternates: { canonical: eventPath(c.id) },
    openGraph: { type: "website", title: c.title, description, url: eventPath(c.id), ...(c.imageUrl ? { images: [c.imageUrl] } : {}) },
    robots: eventState(c, now) === "upcoming" ? undefined : { index: false },
  };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const now = await requestTime();
  const found = await findEvent(id);
  if (found.kind === "unavailable") {
    return <p className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] py-20 text-ink-soft">This event is unavailable right now. Try again in a minute.</p>;
  }
  const c = eventOf(found);
  if (!c) return legacyOr404(`/events/${id}`);
  const full = found.kind === "stored" ? found.full : null;
  const state = eventState(c, now);
  const tickets = state === "upcoming" ? safeTicketUrl(c.ticketUrl) : null;
  const hyfin = await onHyfin(c.artist);
  const seen = new Set(hyfin.stories.map((s) => s.id));
  const stories = [...hyfin.stories, ...(full?.related ?? []).filter((s) => !seen.has(s.id))] as typeof hyfin.stories;
  const plays = hyfin.plays;
  const href = eventPath(c.id);
  const jsonLd = JSON.stringify(eventJsonLd(c, `${SITE_URL}${href}`, now)).replace(/</g, "\\u003c");

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
          {c.type && c.type !== "concert" && <p className="inline-block bg-[#00ff9f] px-2 py-0.5 font-mono text-xs uppercase tracking-[0.1em] text-black">{c.typeLabel}</p>}
          {state !== "upcoming" && <p className="font-mono text-sm uppercase tracking-[0.12em] text-[#ff0040]">{labelFor(state, c.type)}</p>}
          <h1 className="sg-fx mt-2 break-words font-display text-[clamp(40px,6vw,84px)] uppercase leading-[0.88] tracking-[-0.02em]">{c.title}</h1>
          <p className="mt-5 font-mono text-sm uppercase tracking-[0.08em] text-[#ff0040]">
            {formatConcertWhen(c)}
            {c.doorsAt ? ` · doors ${formatClock(c.doorsAt)}` : ""}
          </p>
          <p className="mt-2 text-lg">{[c.venue, full?.address, c.city, c.region].filter(Boolean).join(", ")}</p>
          {full?.priceText && <p className="mt-1 font-mono text-sm text-ink-soft">{full.priceText}</p>}
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
          <div className="mt-4"><ShareButton title={c.title} path={href} /></div>
          {full?.description && <RichBody data={full.description as never} href={href} className="story-body mt-8 text-[18px] leading-relaxed" />}
        </div>
      </div>

      {state === "passed" && full && (full.recap || full.gallery.length > 0) && (
        <section aria-labelledby="recap-heading" className="mt-16">
          <h2 id="recap-heading" className="sg-lines border-b border-white pb-2 font-display text-3xl uppercase">Recap</h2>
          {full.recap && <RichBody data={full.recap as never} href={href} className="story-body mt-6 max-w-[760px] text-[18px] leading-relaxed" />}
          {full.gallery.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
              {full.gallery.map((m) => (
                <li key={m.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- staff photos from the media library */}
                  <img src={m.url} alt={m.alt} loading="lazy" className="sg-frame aspect-[4/3] w-full border border-white object-cover" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        {c.artist && (
          <section aria-labelledby="plays-heading">
            <h2 id="plays-heading" className="border-b border-white pb-2 font-display text-3xl uppercase">{c.artist} on HYFIN</h2>
            {plays.length > 0 ? <ul>{plays.map((p) => <PlayRow key={p.id} play={{ ...p, liveEvent: null }} withDate />)}</ul> : <p className="py-6 text-ink-soft">No recent plays to show.</p>}
          </section>
        )}
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
