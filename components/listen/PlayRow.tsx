import type { Play } from "@/lib/listen/rmPlaylist";
import { formatShortDate, formatTime } from "@/lib/listen/time";
import { EventRow } from "./EventRow";
import { PreviewButton } from "./PreviewButton";

const ART = "size-11 shrink-0 border border-white/40 bg-[#1a1a1a]";

/** One song in the playlist: time, album art (or a same-size placeholder), title, artist, upcoming show. */
export function PlayRow({ play, live = false, withDate = false }: { play: Play; live?: boolean; withDate?: boolean }) {
  const show = play.liveEvent;
  return (
    <li className="grid grid-cols-[72px_44px_1fr_auto] items-center gap-x-4 gap-y-1 border-b border-white/25 py-3 sm:grid-cols-[84px_44px_1fr_auto]">
      <span className={`font-mono text-xs ${live || show ? "text-[#ff0040]" : "text-ink-soft"}`}>
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
      {play.appleMusicSongId ? (
        <PreviewButton appleMusicSongId={play.appleMusicSongId} previewUrl={play.previewUrl} label={`${play.title} by ${play.artist}`} />
      ) : (
        <span aria-hidden="true" />
      )}
      {show && <EventRow event={show} artist={play.artist} fallbackArt={play.artworkUrl} />}
    </li>
  );
}

