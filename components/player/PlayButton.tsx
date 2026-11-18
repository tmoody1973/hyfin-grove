"use client";

import { Button } from "@ui-sdk/react/button";
import { usePlayer } from "./PlayerProvider";

/** Plays one story's audio in the persistent player. */
export function PlayButton({ url, title, href }: { url: string; title: string; href: string }) {
  const { state, play, pause } = usePlayer();
  const isThis = state.source.kind === "story" && state.source.url === url;
  const isPlaying = isThis && (state.status === "playing" || state.status === "loading");
  return (
    <Button
      onClick={() => (isPlaying ? pause() : play({ kind: "story", url, title, href }))}
      className="inline-flex min-h-11 items-center gap-2.5 bg-[#ff0040] px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff9f]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={isPlaying ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4l14 8-14 8z"} />
      </svg>
      {isPlaying ? "Pause" : "Listen"}
    </Button>
  );
}
