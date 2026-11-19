import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ListenHeader } from "@/components/listen/ListenHeader";
import { LivePlaylist } from "@/components/listen/LivePlaylist";
import { OnAirCard } from "@/components/listen/OnAirCard";
import { InTown } from "@/components/events/InTown";
import { inTown } from "@/lib/events/calendar";
import { getConcerts } from "@/lib/events/rmEvents";
import { upcomingOnly } from "@/lib/events/eventPage";
import { PLAYLIST_DAYS, parsePlaylistParams, playlistHref } from "@/lib/listen/params";
import { getAirings, getCurrentPlay, getPlays } from "@/lib/listen/rmPlaylist";
import { addDays, chicagoDayRange, formatClock, formatDayKey, todayKey } from "@/lib/listen/time";


export const metadata: Metadata = {
  title: "Playlist",
  description: "Every song on HYFIN, as it plays.",
  alternates: { canonical: "/listen/playlist" },
};

/** The request time; connection() marks the page as rendered per request (live data). */
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

const DAY_MS = 86_400_000;

const box = "inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs tracking-[0.06em]";

export default async function PlaylistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const now = await requestTime();
  const today = todayKey(now);
  const p = parsePlaylistParams(await searchParams, now);
  // Default view: the last 24 hours, rolling (Tarik, 2026-11-19). A picked day shows that whole calendar day.
  const rolling = p.day === null;
  const { fromMs, toMs } = rolling ? { fromMs: now - DAY_MS, toMs: now + 1 } : chicagoDayRange(p.day!);
  const showsLive = !p.q && (rolling || p.day === today);
  const [plays, airings, current, onNow, concerts] = await Promise.all([
    p.q ? getPlays({ q: p.q, limit: 100 }) : getPlays({ afterMs: fromMs, beforeMs: toMs }),
    getAirings(fromMs, toMs),
    getCurrentPlay(),
    getAirings(now, now + 1),
    getConcerts(),
  ]);
  const onAir = onNow.ok ? onNow.value.airings[0] : undefined;
  const onAirLabel = onAir ? `${onAir.hosts.join(" & ") || onAir.name} until ${formatClock(onAir.endsAt)}` : null;
  const oldest = addDays(today, 1 - PLAYLIST_DAYS);
  const prevDay = rolling ? addDays(today, -1) : p.day! > oldest ? addDays(p.day!, -1) : null;
  // Stepping forward past yesterday returns to the rolling view, which already covers today.
  const nextHref = rolling ? null : playlistHref({ ...p, q: "", day: addDays(p.day!, 1) >= today ? null : addDays(p.day!, 1) });
  const label = rolling ? "Last 24 hours" : p.day === today ? `Today · ${formatDayKey(p.day!)}` : formatDayKey(p.day!);

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <ListenHeader path="/listen/playlist" title="Playlist" lede="Every song on HYFIN, as it plays." active="playlist" />

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white py-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex">
            {prevDay ? <Link className={box} href={playlistHref({ ...p, day: prevDay, q: "" })} aria-label="Previous day">←</Link> : <span className={`${box} opacity-30`} aria-hidden="true">←</span>}
            <span className={`${box} -ml-px`}>{label}</span>
            {nextHref ? <Link className={`${box} -ml-px`} href={nextHref} aria-label="Next day">→</Link> : <span className={`${box} -ml-px opacity-30`} aria-hidden="true">→</span>}
          </div>
          <Link
            href={playlistHref({ ...p, nearbyOnly: !p.nearbyOnly })}
            aria-pressed={p.nearbyOnly}
            className={`${box} uppercase ${p.nearbyOnly ? "border-[#00ff9f] bg-[#00ff9f] text-black" : "border-[#00ff9f] text-[#00ff9f]"}`}
          >
            Only artists with shows nearby
          </Link>
        </div>
        <form action="/listen/playlist" method="get" role="search" className="flex w-full max-w-[400px] flex-col gap-1.5">
          <label htmlFor="q" className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">Search artist or song</label>
          <input id="q" name="q" defaultValue={p.q} maxLength={100} className="min-h-11 border border-white bg-transparent px-3" />
          {p.nearbyOnly && <input type="hidden" name="nearby" value="1" />}
        </form>
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-10">
        {showsLive && <OnAirCard initial={current.ok ? current.value : null} onNow={onAirLabel} />}
        {p.q && <p className="font-mono text-sm">Results for “{p.q}” · <Link className="underline" href={playlistHref({ ...p, q: "" })}>clear</Link></p>}
        {!plays.ok ? (
          <p className="py-10 text-ink-soft">The playlist is unavailable right now. Try again in a minute.</p>
        ) : p.q && plays.value.length === 0 ? (
          <p className="py-10 text-ink-soft">No songs found.</p>
        ) : (
          <LivePlaylist
            initial={plays.value}
            airings={airings.ok ? airings.value.airings : []}
            live={showsLive}
            labelDaysFrom={rolling ? now : undefined}
            nearbyOnly={p.nearbyOnly}
            grouped={!p.q}
            fromMs={fromMs}
          />
        )}
      </div>
      <aside className="lg:pt-2">
        <InTown concerts={concerts.ok ? inTown(upcomingOnly(concerts.value, now), 4) : []} />
      </aside>
      </div>
    </div>
  );
}
