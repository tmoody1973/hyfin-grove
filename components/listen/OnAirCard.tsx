"use client";

import { Button } from "@ui-sdk/react/button";
import { usePlayer } from "@/components/player/PlayerProvider";
import { toPlay, type Play } from "@/lib/listen/rmPlaylist";
import { formatEventDate } from "@/lib/listen/time";
import { EventBadge } from "./PlayRow";
import { useLiveQuery } from "@/lib/listen/useLiveQuery";

const outline = "inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]";

/** The song on air now, live-updating, with where to hear it and HYFIN's live stream. */
export function OnAirCard({ initial, onNow }: { initial: Play | null; onNow: string | null }) {
  const raw = useLiveQuery<Parameters<typeof toPlay>[0] | null | undefined>("plays:currentByStation", { stationSlug: "hyfin" }, undefined);
  const play = raw === undefined ? initial : raw && toPlay(raw);
  const { play: start } = usePlayer();
  return (
    <section aria-label="On air now" className="flex flex-col gap-5 border border-white p-5 sm:flex-row">
      {play?.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- one small cover, served sized by Apple
        <img src={play.artworkUrl} alt={`Album art: ${play.title} by ${play.artist}`} width={128} height={128} className="size-32 shrink-0 border border-white/40 object-cover" />
      ) : (
        <span aria-hidden="true" className="size-32 shrink-0 border border-white/40 bg-[#1a1a1a]" />
      )}
      <div className="min-w-0" aria-live="polite">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">On air now{onNow ? <span className="text-ink-soft"> · {onNow}</span> : null}</p>
        <h2 className="mt-2 break-words font-display text-[clamp(32px,4vw,52px)] uppercase leading-[0.9]">{play?.title ?? "HYFIN"}</h2>
        {play && <p className="mt-2 text-lg">{play.artist}</p>}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button onClick={() => start({ kind: "live" })} className="inline-flex min-h-11 items-center bg-[#ff0040] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff9f]">
            Listen live
          </Button>
          {play?.spotifyTrackId && <a className={outline} href={`https://open.spotify.com/track/${play.spotifyTrackId}`}>Spotify</a>}
          {play?.appleMusicSongId && <a className={outline} href={`https://music.apple.com/us/song/${play.appleMusicSongId}`}>Apple Music</a>}
          {play?.liveEvent && (
            <EventBadge className={`${outline} border-[#00ff9f] text-[#00ff9f]`} href={play.liveEvent.ticketUrl}>
              {play.liveEvent.city} · {formatEventDate(play.liveEvent)} · {play.liveEvent.venue}
            </EventBadge>
          )}
        </div>
      </div>
    </section>
  );
}
