"use client";

import { useEffect } from "react";
import type { Play } from "@/lib/listen/rmPlaylist";
import { mediaMetadata } from "@/lib/mobile/mediaSession";
import type { Player } from "@/components/player/PlayerProvider";

/**
 * Lock screen and notification-shade controls (plan 15, task 4): the song, artist, DJ and cover art, with
 * play/pause. Does nothing where the Media Session API doesn't exist.
 */
export function useMediaSession(player: Pick<Player, "state" | "play" | "pause" | "resume">, song: Play | null, host: string | null) {
  const { state, play, pause, resume } = player;
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

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // an action this browser doesn't support
      }
    };
    set("play", () => (state.status === "paused" ? resume() : play(source)));
    set("pause", () => pause());
    set("stop", () => pause());
    return () => ["play", "pause", "stop"].forEach((a) => set(a as MediaSessionAction, null));
  }, [state.status, source, play, pause, resume]);
}
