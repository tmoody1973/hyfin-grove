import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ListenHeader } from "@/components/listen/ListenHeader";
import { ScheduleDay } from "@/components/listen/ScheduleDay";
import { attachPayload, weeklyLabel } from "@/lib/listen/attach";
import { getDirectory, toHostLite, toShowLite } from "@/lib/listen/directory";
import { getAirings } from "@/lib/listen/rmPlaylist";
import { chicagoDayRange, formatDayKey, isValidDayKey, todayKey, weekKeys } from "@/lib/listen/time";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Who is on HYFIN, and when.",
  alternates: { canonical: "/listen/schedule" },
};

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const now = await requestTime();
  const week = weekKeys(now);
  const today = todayKey(now);
  const asked = (await searchParams).day;
  const day = typeof asked === "string" && isValidDayKey(asked) && week.includes(asked) ? asked : today;
  const weekRange = { fromMs: chicagoDayRange(week[0]).fromMs, toMs: chicagoDayRange(week[6]).toMs };
  const [airings, directory] = await Promise.all([getAirings(weekRange.fromMs, weekRange.toMs), getDirectory()]);
  const all = airings.ok ? attachPayload(airings.value.airings, directory.shows.map(toShowLite), directory.hosts.map(toHostLite)) : [];
  const { fromMs, toMs } = chicagoDayRange(day);
  const todays = all.filter((a) => a.startsAt >= fromMs && a.startsAt < toMs);

  const byProgram = new Map<string, typeof all>();
  for (const a of all) byProgram.set(a.name, [...(byProgram.get(a.name) ?? []), a]);
  const weekly = [...byProgram.values()]
    .map((list) => ({ first: list[0], label: weeklyLabel(list) }))
    .filter((w): w is { first: (typeof all)[number]; label: string } => w.label !== null);

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <ListenHeader path="/listen/schedule" title="Schedule" lede="Who is on HYFIN, and when." active="schedule" />

      <nav aria-label="Days this week" className="flex flex-wrap border-b border-white py-6">
        {week.map((k) => (
          <Link
            key={k}
            href={k === today ? "/listen/schedule" : `/listen/schedule?day=${k}`}
            aria-current={k === day ? "date" : undefined}
            className={`-ml-px inline-flex min-h-11 items-center border border-white px-3 font-mono text-xs uppercase tracking-[0.08em] first:ml-0 ${k === day ? "bg-white text-black" : "hover:text-[#00ff9f]"}`}
          >
            {formatDayKey(k).replace(",", "")}
            {k === today ? " · Today" : ""}
          </Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="day-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="day-heading" className="font-display text-3xl uppercase">{formatDayKey(day)}</h2>
            <span className="font-mono text-xs text-ink-soft">All times Central</span>
          </div>
          {airings.ok ? <ScheduleDay airings={todays} now={now} /> : <p className="py-10 text-ink-soft">The schedule is unavailable right now. Try again in a minute.</p>}
        </section>

        <aside className="flex flex-col gap-10">
          {weekly.length > 0 && (
            <section aria-labelledby="weekly-heading">
              <h2 id="weekly-heading" className="border-b border-white pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Every week</h2>
              <ul>
                {weekly.map(({ first, label }) => (
                  <li key={first.name} className="border-b border-white/25 py-4">
                    <p className="font-display text-xl uppercase leading-none">
                      {first.show ? <Link href={`/shows/${first.show.slug}`} className="hover:text-[#00ff9f]">{first.name}</Link> : first.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink-soft">{label}{first.hostCards.length ? ` · With ${first.hostCards.map((h) => h.name).join(" & ")}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {directory.hosts.length > 0 && (
            <section aria-labelledby="hosts-heading">
              <h2 id="hosts-heading" className="border-b border-white pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Hosts</h2>
              <ul className="mt-4 grid grid-cols-2 gap-4">
                {directory.hosts.map(toHostLite).map((h) => (
                  <li key={h.slug}>
                    <Link href={`/hosts/${h.slug}`} className="group block">
                      {h.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- staff-uploaded host photos
                        <img src={h.photoUrl} alt="" width={150} height={150} loading="lazy" className="aspect-square w-full border border-white/40 object-cover" />
                      ) : (
                        <span aria-hidden="true" className="block aspect-square w-full border border-white/40 bg-[#1a1a1a]" />
                      )}
                      <span className="mt-2 block text-sm group-hover:text-[#00ff9f]">{h.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
