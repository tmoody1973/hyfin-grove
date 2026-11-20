"use client";

import { useEffect } from "react";
import type { Play } from "@/lib/listen/rmPlaylist";
import { mediaMetadata } from "@/lib/mobile/mediaSession";
import type { Player } from "@/components/player/PlayerProvider";

/**
 * Lock screen and notification-shade info (plan 15, task 4): the song, artist, DJ and cover art. Play and pause are
 * left to the browser on purpose: iOS suspends a paused page in the background, so a play handler of ours would never
 * run (2026-11-20, play after a lock-screen pause did nothing). Without handlers, iOS plays and pauses the <audio>
 * element itself, and PlayerProvider follows the element's pause and play events.
 */
export function useMediaSession(player: Pick<Player, "state">, song: Play | null, host: string | null) {
  const { state } = player;
  const source = state.source;
  const storyTitle = source.kind === "story" ? source.title : null;

  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const info =
      storyTitle !== null
        ? ({ kind: "story", title: storyTitle, play: null, onAir: null } as const)
        : ({ kind: "live", play: song && { title: song.title, artist: song.artist, artworkUrl: song.artworkUrl }, onAir: host } as const);
    navigator.mediaSession.metadata = new MediaMetadata(mediaMetadata(info));
  }, [storyTitle, song?.title, song?.artist, song?.artworkUrl, host]); // eslint-disable-line react-hooks/exhaustive-deps -- song identity changes every update

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = state.status === "playing" || state.status === "loading" ? "playing" : state.status === "paused" ? "paused" : "none";
  }, [state.status]);
}
