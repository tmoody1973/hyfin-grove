"use client";

import Link from "next/link";
import { usePlayer } from "@/components/player/PlayerProvider";
import { eventPath } from "@/lib/events/links";
import { useMediaSession } from "./useMediaSession";
import { useOnAir } from "./useOnAir";

/**
 * The phone's mini-player above the tab bar (mockup 08-phone-app: red play, ON AIR NOW, song · artist, DJ until,
 * and a green pin when the artist on air has a show nearby). Mounted at every size so the lock screen works on
 * desktop too; the shell hides it from lg up.
 */
export function MiniPlayer() {
  const player = usePlayer();
  const { state, play, pause, resume } = player;
  const { song, host } = useOnAir();
  useMediaSession(player, song, host);
  const isPlaying = state.status === "playing" || state.status === "loading";
  const story = state.source.kind === "story" ? state.source : null;
  const toggle = () => (isPlaying ? pause() : state.status === "paused" ? resume() : play(state.source));
  const show = !story ? song?.liveEvent : null;

  return (
    <div aria-label="Now playing" className="flex items-center gap-3 border-t border-white bg-black px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : story ? "Play story" : "Play HYFIN live"}
        className={`grid size-12 shrink-0 place-items-center text-black ${story ? "bg-[#0070ff]" : "bg-[#ff0040]"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={isPlaying ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4l14 8-14 8z"} />
        </svg>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-px" aria-live="polite">
        <span className={`flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${story ? "text-white" : "text-[#ff0040]"}`}>
          {!story && <span aria-hidden className={`size-[7px] bg-[#ff0040] ${state.status === "playing" ? "animate-pulse" : ""}`} />}
          {state.error ?? (story ? "Now playing" : "On air now")}
        </span>
        <span className="truncate text-[15px] font-semibold leading-tight">
          {story ? story.title : song ? `${song.title} · ${song.artist}` : "HYFIN"}
        </span>
        {!story && host && <span className="truncate font-mono text-[11px] text-[#b8b8b8]">{host}</span>}
      </div>
      {story ? (
        <button type="button" onClick={() => play({ kind: "live" })} className="inline-flex h-11 shrink-0 items-center gap-1.5 border border-[#ff0040] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
          <span aria-hidden className="size-[7px] bg-[#ff0040]" />
          Live
        </button>
      ) : show ? (
        <Link
          href={eventPath(show.eventId)}
          aria-label={`${song?.artist ?? "This artist"} has a show nearby. See details`}
          className="grid size-11 shrink-0 place-items-center border border-[#00ff9f] text-[#00ff9f]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}
