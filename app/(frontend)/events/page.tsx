import type { Metadata } from "next";
import { SignupBox } from "@/components/newsletter/SignupBox";
import Link from "next/link";
import { connection } from "next/server";
import { ConcertRow } from "@/components/events/ConcertRow";
import { MonthCalendar } from "@/components/events/MonthCalendar";
import { concertDayKey, formatConcertWhen, METROS, metroOf, type Metro } from "@/lib/events/calendar";
import { addMonths, eventsHref, MONTHS_AHEAD, parseEventsParams } from "@/lib/events/params";
import config from "@payload-config";
import { getPayload } from "payload";
import { TypeFilter } from "@/components/events/TypeFilter";
import { upcomingEvents, type EventView } from "@/lib/events/store";
import { todayKey } from "@/lib/listen/time";

export const metadata: Metadata = {
  title: "Events",
  description: "Concerts by artists HYFIN plays, plus HYFIN's own events, in Milwaukee, Chicago and Madison.",
  alternates: { canonical: "/events" },
};

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

const tab = "-ml-px inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] first:ml-0";

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const now = await requestTime();
  const today = todayKey(now);
  const currentMonth = today.slice(0, 7);
  const p = parseEventsParams(await searchParams, now);
  const db = await getPayload({ config });
  const events = await upcomingEvents(db, { now, type: p.type });
  const shown = events.filter((c) => !p.metro || metroOf(c) === p.metro);
  const days = new Map<string, EventView[]>();
  for (const c of shown) days.set(concertDayKey(c), [...(days.get(concertDayKey(c)) ?? []), c]);
  const showDays = new Set([...days.keys()].filter((k) => k.startsWith(p.month)));
  const prev = p.month > currentMonth ? eventsHref({ ...p, month: addMonths(p.month, -1) }, currentMonth) : null;
  const next = p.month < addMonths(currentMonth, MONTHS_AHEAD) ? eventsHref({ ...p, month: addMonths(p.month, 1) }, currentMonth) : null;
  const metroTabs: Array<Metro | null> = [null, ...METROS];

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <header className="border-b border-white pb-7">
        <p className="font-mono text-xs text-ink-soft">/events</p>
        <h1 className="sg-fx sg-lines mt-3 font-display text-[clamp(56px,9vw,120px)] uppercase leading-[0.85] tracking-[-0.02em]">Events</h1>
        <p className="mt-5 text-lg">Concerts by artists HYFIN plays, plus HYFIN&apos;s own events, in Milwaukee, Chicago and Madison.</p>
        <nav aria-label="Where" className="mt-6 flex">
          {metroTabs.map((m) => (
            <Link key={m ?? "all"} href={eventsHref({ ...p, metro: m }, currentMonth)} aria-current={p.metro === m ? "page" : undefined} className={`${tab} ${p.metro === m ? "bg-white text-black" : "hover:text-[#00ff9f]"}`}>
              {m ?? "All"}
            </Link>
          ))}
        </nav>
        <TypeFilter current={p.type} hrefFor={(type) => eventsHref({ ...p, type }, currentMonth)} />
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[320px_1fr]">
        <aside>
          <MonthCalendar month={p.month} showDays={showDays} today={today} prevHref={prev} nextHref={next} />
        </aside>
        <section aria-labelledby="coming-up">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white pb-2">
            <h2 id="coming-up" className="sg-lines font-display text-3xl uppercase">Coming up</h2>
            <span className="font-mono text-xs text-ink-soft">All times Central · <Link href="/events/past" className="underline underline-offset-4 hover:text-[#00ff9f]">Past events</Link></span>
          </div>
          {shown.length === 0 ? (
            <p className="py-10 text-ink-soft">Nothing coming up{p.metro ? ` in ${p.metro}` : ""}{p.type ? " of this type" : ""} right now.</p>
          ) : (
            [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, list]) => (
              <div key={day} id={`day-${day}`} className="scroll-mt-28">
                <h3 className="sr-only">{formatConcertWhen({ startsAtMs: list[0].startsAtMs, dateOnly: list[0].dateOnly }).split(" · ")[0]}</h3>
                <ul>{list.map((c) => <ConcertRow key={c.id} concert={c} label={c.type === "concert" ? undefined : c.typeLabel} />)}</ul>
              </div>
            ))
          )}
          <aside aria-label="Newsletter" className="mt-12 flex max-w-[720px] flex-col gap-3 border-t border-white pt-6">
            <p className="m-0 font-display text-2xl uppercase leading-none">Get Milwaukee events in your inbox</p>
            <SignupBox placement="events" />
          </aside>
        </section>
      </div>
    </div>
  );
}
