"use client";

import { ConvexClient } from "convex/browser";
import { anyApi } from "convex/server";
import { useEffect, useState } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL ?? "";

export type NowPlaying = { artist: string; title: string };

/**
 * HYFIN's current song from rm-playlist-v2's public `plays:currentByStation` query, live-updating.
 * Returns null when the URL is unset, the query fails, or nothing is playing.
 */
export function useNowPlaying(): NowPlaying | null {
  const [now, setNow] = useState<NowPlaying | null>(null);
  useEffect(() => {
    if (!CONVEX_URL) return;
    const client = new ConvexClient(CONVEX_URL);
    const unsubscribe = client.onUpdate(
      anyApi.plays.currentByStation,
      { stationSlug: "hyfin" },
      (play: { artist: string; title: string } | null) => setNow(play ? { artist: play.artist, title: play.title } : null),
      () => setNow(null),
    );
    return () => {
      unsubscribe();
      void client.close();
    };
  }, []);
  return now;
}
