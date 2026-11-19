import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ListenHeader } from "@/components/listen/ListenHeader";
import { LivePlaylist } from "@/components/listen/LivePlaylist";
import { OnAirCard } from "@/components/listen/OnAirCard";
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

const box = "inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs tracking-[0.06em]";

export default async function PlaylistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const now = await requestTime();
  const today = todayKey(now);
  const p = parsePlaylistParams(await searchParams, now);
  const { fromMs, toMs } = chicagoDayRange(p.day);
  const [plays, airings, current, onNow] = await Promise.all([
    p.q ? getPlays({ q: p.q, limit: 100 }) : getPlays({ afterMs: fromMs, beforeMs: toMs, limit: 500 }),
    getAirings(fromMs, toMs),
    getCurrentPlay(),
    getAirings(now, now + 1),
  ]);
  const onAir = onNow.ok ? onNow.value.airings[0] : undefined;
  const onAirLabel = onAir ? `${onAir.hosts.join(" & ") || onAir.name} until ${formatClock(onAir.endsAt)}` : null;
  const prev = addDays(p.day, -1) >= addDays(today, 1 - PLAYLIST_DAYS) ? addDays(p.day, -1) : null;
  const next = p.day < today ? addDays(p.day, 1) : null;

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <ListenHeader path="/listen/playlist" title="Playlist" lede="Every song on HYFIN, as it plays." active="playlist" />

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white py-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex">
            {prev ? <Link className={box} href={playlistHref({ ...p, day: prev, q: "" }, today)} aria-label="Previous day">←</Link> : <span className={`${box} opacity-30`} aria-hidden="true">←</span>}
            <span className={`${box} -ml-px`}>{p.day === today ? `Today · ${formatDayKey(p.day)}` : formatDayKey(p.day)}</span>
            {next ? <Link className={`${box} -ml-px`} href={playlistHref({ ...p, day: next, q: "" }, today)} aria-label="Next day">→</Link> : <span className={`${box} -ml-px opacity-30`} aria-hidden="true">→</span>}
          </div>
          <Link
            href={playlistHref({ ...p, nearbyOnly: !p.nearbyOnly }, today)}
            aria-pressed={p.nearbyOnly}
            className={`${box} uppercase ${p.nearbyOnly ? "border-[#00ff9f] bg-[#00ff9f] text-black" : "border-[#00ff9f] text-[#00ff9f]"}`}
          >
            Only artists with shows nearby
          </Link>
        </div>
        <form action="/listen/playlist" method="get" role="search" className="flex w-full max-w-[400px] flex-col gap-1.5">
          <label htmlFor="q" className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">Search artist or song</label>
          <input id="q" name="q" defaultValue={p.q} maxLength={100} className="min-h-11 border border-white bg-transparent px-3" />
        </form>
      </div>

      <div className="mt-8 flex flex-col gap-10">
        {!p.q && p.day === today && <OnAirCard initial={current.ok ? current.value : null} onNow={onAirLabel} />}
        {p.q && <p className="font-mono text-sm">Results for “{p.q}” · <Link className="underline" href={playlistHref({ ...p, q: "" }, today)}>clear</Link></p>}
        {!plays.ok ? (
          <p className="py-10 text-ink-soft">The playlist is unavailable right now. Try again in a minute.</p>
        ) : p.q && plays.value.length === 0 ? (
          <p className="py-10 text-ink-soft">No songs found.</p>
        ) : (
          <LivePlaylist
            initial={plays.value}
            airings={airings.ok ? airings.value.airings : []}
            live={!p.q && p.day === today}
            nearbyOnly={p.nearbyOnly}
            grouped={!p.q}
            fromMs={fromMs}
          />
        )}
      </div>
    </div>
  );
}
