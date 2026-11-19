import type { Play } from "@/lib/listen/rmPlaylist";
import { formatShortDate, formatTime } from "@/lib/listen/time";
import { EventRow } from "./EventRow";

const ART = "size-11 shrink-0 border border-white/40 bg-[#1a1a1a]";

/** One song in the playlist: time, album art (or a same-size placeholder), title, artist, upcoming show. */
export function PlayRow({ play, live = false, withDate = false }: { play: Play; live?: boolean; withDate?: boolean }) {
  const show = play.liveEvent;
  return (
    <li className="grid grid-cols-[72px_44px_1fr] items-center gap-x-4 gap-y-1 border-b border-white/25 py-3 sm:grid-cols-[84px_44px_1fr]">
      <span className={`font-mono text-xs ${live ? "text-[#ff0040]" : show ? "text-[#00ff9f]" : "text-ink-soft"}`}>
        {live ? "LIVE" : withDate ? `${formatShortDate(play.playedAt)} · ${formatTime(play.playedAt)}` : formatTime(play.playedAt)}
      </span>
      {play.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- fixed 44px thumbnails; optimizing 100+ per page isn't worth the cost
        <img src={play.artworkUrl} alt={`Album art: ${play.title} by ${play.artist}`} width={44} height={44} loading="lazy" className={`${ART} object-cover`} />
      ) : (
        <span data-artwork-placeholder="true" aria-hidden="true" className={ART} />
      )}
      <span className="min-w-0 break-words">
        <span className="block font-semibold">{play.title}</span>
        <span className="block text-sm text-ink-soft">{play.artist}</span>
      </span>
      {show && <EventRow event={show} artist={play.artist} fallbackArt={play.artworkUrl} />}
    </li>
  );
}

