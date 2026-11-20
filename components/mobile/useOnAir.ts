"use client";

import { useEffect, useState } from "react";
import { toPlay, type Airing, type Play } from "@/lib/listen/rmPlaylist";
import { useLiveQuery } from "@/lib/listen/useLiveQuery";
import { onAirLabel } from "@/lib/mobile/onAir";

const HOUR = 3_600_000;

/** The song on air and who's hosting, live from rm-playlist (the same public queries the playlist page uses). */
export function useOnAir(): { song: Play | null; host: string | null } {
  const raw = useLiveQuery<Parameters<typeof toPlay>[0] | null | undefined>("plays:currentByStation", { stationSlug: "hyfin" }, undefined);
  // One schedule window around page load; the label re-picks the current show every minute.
  const [window] = useState(() => {
    const t = Date.now();
    return { fromMs: t - 6 * HOUR, toMs: t + 18 * HOUR };
  });
  const schedule = useLiveQuery<{ airings: Airing[] } | undefined>("alexa:stationAirings", { station: "hyfin", ...window }, undefined);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return { song: raw ? toPlay(raw) : null, host: schedule ? onAirLabel(schedule.airings, now) : null };
}
