import { addDays, isValidDayKey, todayKey } from "./time";

/** `day: null` is the default view: the last 24 hours, rolling. A day key shows that full calendar day. */
export type PlaylistParams = { day: string | null; q: string; nearbyOnly: boolean };

/** How far back the day picker goes: today and the six days before it. */
export const PLAYLIST_DAYS = 7;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parsePlaylistParams(sp: Record<string, string | string[] | undefined>, now: number): PlaylistParams {
  const today = todayKey(now);
  const day = first(sp.day);
  const allowed = isValidDayKey(day) && day <= today && day >= addDays(today, 1 - PLAYLIST_DAYS);
  return { day: allowed ? day : null, q: first(sp.q).trim().slice(0, 100), nearbyOnly: first(sp.nearby) === "1" };
}

export function playlistHref(p: PlaylistParams): string {
  const qs = new URLSearchParams();
  if (p.day) qs.set("day", p.day);
  if (p.q) qs.set("q", p.q);
  if (p.nearbyOnly) qs.set("nearby", "1");
  const s = qs.toString();
  return s ? `/listen/playlist?${s}` : "/listen/playlist";
}
