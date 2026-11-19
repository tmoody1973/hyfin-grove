import type { ReactNode } from "react";
import type { Play } from "@/lib/listen/rmPlaylist";
import { formatEventDate, formatShortDate, formatTime } from "@/lib/listen/time";

const ART = "size-11 shrink-0 border border-white/40 bg-[#1a1a1a]";

/** One song in the playlist: time, album art (or a same-size placeholder), title, artist, upcoming show. */
export function PlayRow({ play, live = false, withDate = false }: { play: Play; live?: boolean; withDate?: boolean }) {
  const show = play.liveEvent;
  return (
    <li className="grid grid-cols-[72px_44px_1fr] items-center gap-x-4 gap-y-1 border-b border-white/25 py-3 sm:grid-cols-[84px_44px_1fr_auto]">
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
      {show && (
        <EventBadge href={show.ticketUrl} className="col-start-3 font-mono text-xs text-[#00ff9f] sm:col-start-4">
          {show.city} · {formatEventDate(show)}
        </EventBadge>
      )}
    </li>
  );
}

/** A link to tickets when there is one; otherwise plain text (no dead links). */
export function EventBadge({ href, className, children }: { href: string | null; className: string; children: ReactNode }) {
  return href ? <a href={href} className={`${className} underline underline-offset-2`}>{children}</a> : <span className={className}>{children}</span>;
}
