import type { Metadata } from "next";
import { JoinPanel } from "@/components/newsletter/JoinPanel";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import config from "@payload-config";
import { getPayload } from "payload";
import { HeardLive } from "@/components/home/HeardLive";
import { type OriginalShow, Originals } from "@/components/home/Originals";
import { SignalLog } from "@/components/home/SignalLog";
import { LeadStory } from "@/components/stories/LeadStory";
import { MediaBox, StoryCard, metaLine } from "@/components/stories/StoryCard";
import { inTown } from "@/lib/events/calendar";
import { upcomingEvents } from "@/lib/events/store";
import { SIGNAL_LOG_SIZE, radioStationJsonLd } from "@/lib/home";
import { normalizeName, weeklyLabel } from "@/lib/listen/attach";
import { type Airing, getAirings, getPlays } from "@/lib/listen/rmPlaylist";
import { visible } from "@/lib/postQueries";
import { SITE_URL } from "@/lib/seo";
import { type Db, getLead, getPostPage, mergeByDate } from "@/lib/stories";
import { NPR_RACE_TOPIC, getNprTopic, nprCard } from "@/lib/npr/topic";

export const metadata: Metadata = {
  title: { absolute: "HYFIN · Black music and culture from Milwaukee" },
  description: "HYFIN: Black music and culture from Radio Milwaukee. New music, interviews, shows, the live playlist and concerts in town.",
  alternates: { canonical: "/" },
};

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

/** Shows that have stories, the one with the newest story first, each with its weekly slot when on the schedule. */
async function originals(db: Db, airings: Airing[]): Promise<OriginalShow[]> {
  const { docs: shows } = await db.find({ collection: "shows", pagination: false, depth: 0, select: { name: true, slug: true, cadenceProgramName: true } });
  const latest = await Promise.all(
    shows.map(async (s) => {
      const { docs } = await db.find({ collection: "posts", where: visible({ show: { equals: s.id } }), sort: "-publishedAt", limit: 1, pagination: false, depth: 0, select: { publishedAt: true } });
      return { show: s, newest: docs[0]?.publishedAt ?? null };
    }),
  );
  return latest
    .filter((x) => x.newest)
    .sort((a, b) => b.newest!.localeCompare(a.newest!))
    .map(({ show: s }) => ({
      slug: s.slug,
      name: s.name,
      slot: s.cadenceProgramName ? weeklyLabel(airings.filter((a) => normalizeName(a.name) === normalizeName(s.cadenceProgramName!))) : null,
    }));
}

function Heading({ n, id, children, more, note }: { n: string; id: string; children: React.ReactNode; more?: { href: string; label: string }; note?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-white pt-[22px]">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[13px] text-ink-soft">{n}</span>
        <h2 id={id} className="sg-lines m-0 font-display text-[clamp(34px,4.4vw,60px)] uppercase leading-none tracking-[-0.02em]">
          {children}
        </h2>
      </div>
      {note}
      {more && (
        <Link href={more.href} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.08em] hover:text-[#00ff9f]">
          {more.label}
        </Link>
      )}
    </div>
  );
}

/** The live playlist, fetched on its own so a slow rm-playlist never holds up the stories (it streams in). */
async function SignalLogBlock({ now }: { now: number }) {
  const plays = await getPlays({ afterMs: now - 3 * HOUR, beforeMs: now + 1 });
  return <SignalLog initial={plays.ok ? plays.value.slice(0, SIGNAL_LOG_SIZE) : []} />;
}

/** Same idea: the shows row needs this week's schedule from rm-playlist for its time slots. */
async function OriginalsBlock({ db, now }: { db: Db; now: number }) {
  const week = await getAirings(now, now + WEEK);
  return <Originals shows={await originals(db, week.ok ? week.value.airings : [])} />;
}

/** Concerts only (the block's copy is "Heard on HYFIN"); read from Events, so a concert staff hide stays hidden. */
async function ConcertsBlock({ db, now }: { db: Db; now: number }) {
  const concerts = await upcomingEvents(db, { now, type: "concert" }).catch(() => []);
  return <HeardLive concerts={inTown(concerts, 4)} />;
}

function SignalLogLoading() {
  return (
    <aside aria-label="Playlist log" aria-busy="true" className="flex min-w-0 flex-[1_1_250px] flex-col font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
      <span className="pb-2.5">Signal log</span>
      <span className="border-t border-white py-2.5 normal-case tracking-normal">Loading the playlist…</span>
    </aside>
  );
}

/** The homepage (mockup screens/01-home/homepage.html, minus the post-launch parts listed in plan 6). */
export default async function HomePage() {
  const now = await requestTime();
  const db = await getPayload({ config });
  const front = await db.findGlobal({ slug: "front-page", depth: 0 });
  // Only Payload reads here; the rm-playlist blocks stream in under <Suspense>.
  const lead = await getLead(db, front.homeLead);
  // An unpinned Milwaukee lead must not repeat the cover story.
  const mkeLead = await getLead(db, front.milwaukeeLead, "milwaukee", [lead?.id]);
  const [ours, mkeMore, npr] = await Promise.all([
    getPostPage(db, { excludeIds: [lead?.id], page: 1, perPage: 8 }),
    getPostPage(db, { category: "milwaukee", excludeIds: [lead?.id, mkeLead?.id], page: 1, perPage: 3 }),
    getNprTopic(NPR_RACE_TOPIC, 4),
  ]);
  // NPR's Race stories compete for Latest by date (decision 010); each opens on HYFIN.
  const latest = { cards: mergeByDate(ours.cards, npr.map(nprCard), 8) };
  const mkeMeta = mkeLead && metaLine(mkeLead);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-20 px-[clamp(20px,4vw,60px)] pb-20 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: radioStationJsonLd(SITE_URL) }} />
      <h1 className="sr-only">HYFIN: Black music and culture from Radio Milwaukee</h1>

      <section aria-label="Cover story and signal log" className="relative flex flex-wrap-reverse gap-x-9 gap-y-7 overflow-hidden">
        <div className="sg-scan" aria-hidden />
        <div className="sg-tear" aria-hidden />
        <Suspense fallback={<SignalLogLoading />}>
          <SignalLogBlock now={now} />
        </Suspense>
        {lead && (
          <div className="min-w-0 flex-[3_1_640px]">
            <LeadStory card={lead} slice />
          </div>
        )}
      </section>

      <section aria-labelledby="latest" className="flex flex-col gap-7">
        <Heading n="02" id="latest" note={<span className="font-mono text-[11px] text-ink-soft lg:hidden">Swipe · {latest.cards.length} stories</span>}>
          Latest
        </Heading>
        {/* Phones (mockup 08-phone-app): 232 px cards, the row runs to the screen edge so the next card peeks in. */}
        <div aria-label="Latest stories, scrollable" className="-mr-[clamp(20px,4vw,60px)] flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-4 pr-[clamp(20px,4vw,60px)] [scrollbar-width:none] sm:mr-0 sm:gap-6 sm:pr-0 sm:[scrollbar-width:auto]">
          {latest.cards.map((c) => (
            <div key={c.id} className="shrink-0 basis-[232px] snap-start sm:basis-[min(300px,78vw)]">
              <StoryCard card={c} />
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter: right after the first stories, framed so it stands out (2026-11-20: was 3 screens down on desktop, 5½ on phones). */}
      <JoinPanel />

      <Suspense fallback={null}>
        <OriginalsBlock db={db} now={now} />
      </Suspense>

      <Suspense fallback={null}>
        <ConcertsBlock db={db} now={now} />
      </Suspense>

      {mkeLead && (
        <section aria-labelledby="milwaukee-made" className="flex flex-col gap-7">
          <Heading n="05" id="milwaukee-made" more={{ href: "/milwaukee", label: "More from Milwaukee" }}>
            Milwaukee Made
          </Heading>
          <div className="flex flex-wrap gap-x-12 gap-y-7">
            <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
              <Link href={mkeLead.href} tabIndex={-1} aria-hidden>
                <MediaBox card={mkeLead} box="aspect-video" sizes="(min-width: 1024px) 60vw, 100vw" />
              </Link>
              <h3 className="m-0 max-w-[780px] break-words text-[clamp(26px,2.8vw,40px)] font-semibold leading-[1.12] [text-wrap:balance]">
                <Link href={mkeLead.href} className="hover:text-[#00ff9f]">
                  {mkeLead.title}
                </Link>
              </h3>
              {mkeMeta && <span className="font-mono text-xs text-ink-soft">{mkeMeta}</span>}
            </article>
            <div className="flex min-w-0 flex-[1_1_340px] flex-col">
              {mkeMore.cards.map((c, i) => {
                const meta = metaLine(c);
                return (
                  <article key={c.id} className={`flex flex-col gap-2 ${i === 0 ? "pb-5" : "border-t border-rule py-5"}`}>
                    <h3 className="m-0 break-words text-[22px] font-semibold leading-tight [text-wrap:balance]">
                      <Link href={c.href} className="hover:text-[#00ff9f]">
                        {c.title}
                      </Link>
                    </h3>
                    {meta && <span className="font-mono text-xs text-ink-soft">{meta}</span>}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
