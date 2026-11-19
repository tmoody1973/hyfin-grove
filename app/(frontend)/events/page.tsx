import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ConcertRow } from "@/components/events/ConcertRow";
import { MonthCalendar } from "@/components/events/MonthCalendar";
import { concertDayKey, formatConcertWhen, METROS, type Metro } from "@/lib/events/calendar";
import { addMonths, eventsHref, MONTHS_AHEAD, parseEventsParams } from "@/lib/events/params";
import { getConcerts, type Concert } from "@/lib/events/rmEvents";
import { todayKey } from "@/lib/listen/time";

export const metadata: Metadata = {
  title: "Events",
  description: "Concerts by artists HYFIN plays, in Milwaukee, Chicago and Madison.",
  alternates: { canonical: "/events" },
};

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

/** rm-playlist sends the metro; until it does (or for older rows), a show in one of the three cities counts. */
const metroOf = (c: Concert): string | null => c.metro ?? ((METROS as readonly string[]).includes(c.city) ? c.city : null);

const tab = "-ml-px inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] first:ml-0";

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const now = await requestTime();
  const today = todayKey(now);
  const currentMonth = today.slice(0, 7);
  const p = parseEventsParams(await searchParams, now);
  const concerts = await getConcerts();
  const shown = concerts.ok ? concerts.value.filter((c) => !p.metro || metroOf(c) === p.metro) : [];
  const days = new Map<string, Concert[]>();
  for (const c of shown) days.set(concertDayKey(c), [...(days.get(concertDayKey(c)) ?? []), c]);
  const showDays = new Set([...days.keys()].filter((k) => k.startsWith(p.month)));
  const prev = p.month > currentMonth ? eventsHref({ ...p, month: addMonths(p.month, -1) }, currentMonth) : null;
  const next = p.month < addMonths(currentMonth, MONTHS_AHEAD) ? eventsHref({ ...p, month: addMonths(p.month, 1) }, currentMonth) : null;
  const metroTabs: Array<Metro | null> = [null, ...METROS];

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <header className="border-b border-white pb-7">
        <p className="font-mono text-xs text-ink-soft">/events</p>
        <h1 className="mt-3 font-display text-[clamp(56px,9vw,120px)] uppercase leading-[0.85] tracking-[-0.02em]">Events</h1>
        <p className="mt-5 text-lg">Concerts by artists HYFIN plays, in Milwaukee, Chicago and Madison.</p>
        <nav aria-label="Where" className="mt-6 flex">
          {metroTabs.map((m) => (
            <Link key={m ?? "all"} href={eventsHref({ ...p, metro: m }, currentMonth)} aria-current={p.metro === m ? "page" : undefined} className={`${tab} ${p.metro === m ? "bg-white text-black" : "hover:text-[#00ff9f]"}`}>
              {m ?? "All"}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[320px_1fr]">
        <aside>
          <MonthCalendar month={p.month} showDays={showDays} today={today} prevHref={prev} nextHref={next} />
        </aside>
        <section aria-labelledby="coming-up">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white pb-2">
            <h2 id="coming-up" className="font-display text-3xl uppercase">Coming up</h2>
            <span className="font-mono text-xs text-ink-soft">Matched from the HYFIN playlist · all times Central</span>
          </div>
          {!concerts.ok ? (
            <p className="py-10 text-ink-soft">Concerts are unavailable right now. Try again in a minute.</p>
          ) : shown.length === 0 ? (
            <p className="py-10 text-ink-soft">No upcoming shows for these artists{p.metro ? ` in ${p.metro}` : ""} right now.</p>
          ) : (
            [...days.entries()].map(([day, list]) => (
              <div key={day} id={`day-${day}`} className="scroll-mt-28">
                <h3 className="sr-only">{formatConcertWhen({ startsAtMs: list[0].startsAtMs, dateOnly: list[0].dateOnly }).split(" · ")[0]}</h3>
                <ul>{list.map((c) => <ConcertRow key={c.id} concert={c} />)}</ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
