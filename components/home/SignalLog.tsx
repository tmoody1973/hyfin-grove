"use client";

import Link from "next/link";
import { eventPath } from "@/lib/events/links";
import { type Play, toPlay } from "@/lib/listen/rmPlaylist";
import { formatTime } from "@/lib/listen/time";
import { useLiveQuery } from "@/lib/listen/useLiveQuery";

import { SIGNAL_LOG_SIZE } from "@/lib/home";

const showDate = (ms: number, dateOnly: boolean) =>
  new Intl.DateTimeFormat("en-US", { timeZone: dateOnly ? "UTC" : "America/Chicago", month: "short", day: "numeric" }).format(ms);
const newest = (plays: Play[]) => [...plays].sort((a, b) => b.playedAt - a.playedAt).slice(0, SIGNAL_LOG_SIZE);
const replaceWithLive = (_: Play[], incoming: Parameters<typeof toPlay>[0][]) => newest(incoming.map(toPlay));

/** The homepage "Signal log" (mockup homepage.html): the last 12 songs, live. Concert matches use the site red. */
export function SignalLog({ initial }: { initial: Play[] }) {
  const plays = newest(useLiveQuery("plays:recentByStation", { stationSlug: "hyfin", limit: SIGNAL_LOG_SIZE }, initial, true, replaceWithLive));
  return (
    <aside aria-label="Playlist log" className="flex min-w-0 flex-[1_1_250px] flex-col font-mono text-xs leading-[1.45]">
      <div className="flex justify-between gap-3 pb-2.5 uppercase tracking-[0.1em] text-ink-soft">
        <span>Signal log</span>
        <Link href="/listen/playlist" className="hover:text-[#00ff9f]">
          /playlist
        </Link>
      </div>
      {plays.length === 0 && <p className="border-t border-white py-2.5 text-ink-soft">Playlist unavailable right now.</p>}
      {plays.map((p, i) => {
        const e = p.liveEvent;
        return (
          <div key={p.id} data-play className={`flex gap-3 py-[9px] ${i === 0 ? "border-t border-white" : "border-t border-[#333]"} ${e ? "text-[#ff0040]" : ""}`}>
            <span className={`shrink-0 basis-[58px] ${e ? "" : "text-ink-soft"}`}>{formatTime(p.playedAt)}</span>
            <span className="min-w-0 break-words">
              {p.artist} <span className={e ? "" : "text-ink-soft"}>{p.title}</span>
              {e && (
                <>
                  {" "}
                  <Link href={eventPath(e.eventId)} className="underline underline-offset-2">
                    {e.city === "Milwaukee" ? "MKE" : e.city} {showDate(e.startsAtMs, e.dateOnly)}
                  </Link>
                </>
              )}
            </span>
          </div>
        );
      })}
    </aside>
  );
}
