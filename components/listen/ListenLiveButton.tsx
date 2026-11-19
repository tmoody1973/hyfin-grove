"use client";

import { Button } from "@ui-sdk/react/button";
import { usePlayer } from "@/components/player/PlayerProvider";

/** Starts HYFIN's live stream in the persistent player. */
export function ListenLiveButton() {
  const { play } = usePlayer();
  return (
    <Button
      onClick={() => play({ kind: "live" })}
      className="inline-flex min-h-11 items-center bg-[#ff0040] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff9f]"
    >
      Listen live
    </Button>
  );
}
