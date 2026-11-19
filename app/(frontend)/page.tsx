import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";
import { HeardLive } from "@/components/home/HeardLive";
import { type OriginalShow, Originals } from "@/components/home/Originals";
import { SignalLog } from "@/components/home/SignalLog";
import { LeadStory } from "@/components/stories/LeadStory";
import { MediaBox, StoryCard, metaLine } from "@/components/stories/StoryCard";
import { inTown } from "@/lib/events/calendar";
import { upcomingOnly } from "@/lib/events/eventPage";
import { getConcerts } from "@/lib/events/rmEvents";
import { SIGNAL_LOG_SIZE, radioStationJsonLd } from "@/lib/home";
import { normalizeName, weeklyLabel } from "@/lib/listen/attach";
import { type Airing, getAirings, getPlays } from "@/lib/listen/rmPlaylist";
import { visible } from "@/lib/postQueries";
import { SITE_URL } from "@/lib/seo";
import { type Db, getLead, getPostPage } from "@/lib/stories";

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
      const { docs } = await db.find({ collection: "posts", where: visible({ show: { equals: s.id } }), sort: "-publishedAt", limit: 1, depth: 0, select: { publishedAt: true } });
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

function Heading({ n, id, children, more }: { n: string; id: string; children: React.ReactNode; more?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-white pt-[22px]">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[13px] text-ink-soft">{n}</span>
        <h2 id={id} className="m-0 font-display text-[clamp(34px,4.4vw,60px)] uppercase leading-none tracking-[-0.02em]">
          {children}
        </h2>
      </div>
      {more && (
        <Link href={more.href} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.08em] hover:text-[#00ff9f]">
          {more.label}
        </Link>
      )}
    </div>
  );
}

/** The homepage (mockup screens/01-home/homepage.html, minus the post-launch parts listed in plan 6). */
export default async function HomePage() {
  const now = await requestTime();
  const db = await getPayload({ config });
  const front = await db.findGlobal({ slug: "front-page", depth: 0 });
  // rm-playlist reads never throw (they return { ok: false }), so a playlist outage only empties those blocks.
  const [lead, mkeLead, plays, week, concerts] = await Promise.all([
    getLead(db, front.homeLead),
    getLead(db, front.milwaukeeLead, "milwaukee"),
    getPlays({ afterMs: now - 3 * HOUR, beforeMs: now + 1 }),
    getAirings(now, now + WEEK),
    getConcerts(),
  ]);
  const [latest, mkeMore, shows] = await Promise.all([
    getPostPage(db, { excludeId: lead?.id, page: 1, perPage: 8 }),
    getPostPage(db, { category: "milwaukee", excludeId: mkeLead?.id, page: 1, perPage: 3 }),
    originals(db, week.ok ? week.value.airings : []),
  ]);
  const signal = plays.ok ? plays.value.slice(0, SIGNAL_LOG_SIZE) : [];
  const nextShows = concerts.ok ? inTown(upcomingOnly(concerts.value, now), 4) : [];
  const mkeMeta = mkeLead && metaLine(mkeLead);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-20 px-[clamp(20px,4vw,60px)] pb-20 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: radioStationJsonLd(SITE_URL) }} />
      <h1 className="sr-only">HYFIN: Black music and culture from Radio Milwaukee</h1>

      <section aria-label="Cover story and signal log" className="flex flex-wrap-reverse gap-x-9 gap-y-7">
        <SignalLog initial={signal} />
        {lead && (
          <div className="min-w-0 flex-[3_1_640px]">
            <LeadStory card={lead} />
          </div>
        )}
      </section>

      <section aria-labelledby="latest" className="flex flex-col gap-7">
        <Heading n="02" id="latest">
          Latest
        </Heading>
        <div aria-label="Latest stories, scrollable" className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4">
          {latest.cards.map((c) => (
            <div key={c.id} className="shrink-0 basis-[min(300px,78vw)] snap-start">
              <StoryCard card={c} />
            </div>
          ))}
        </div>
      </section>

      <Originals shows={shows} />

      <HeardLive concerts={nextShows} />

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
