import { formatClock, todayKey } from "../listen/time";

/** rm-playlist's metros (a show in Gary or Rosemont is in the Chicago metro). */
export const METROS = ["Milwaukee", "Chicago", "Madison"] as const;
export type Metro = (typeof METROS)[number];

type When = { startsAtMs: number; dateOnly: boolean };

/** A date-only show is stored as its date at midnight UTC: use the UTC date. Timed shows use Central time. */
export const concertDayKey = (c: When): string => (c.dateOnly ? new Date(c.startsAtMs).toISOString().slice(0, 10) : todayKey(c.startsAtMs));

const dayLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

/** "Fri, Dec 4 · 8 pm", or "Fri, Dec 4 · Time TBA" for a date-only show. */
export function formatConcertWhen(c: When): string {
  const [y, m, d] = concertDayKey(c).split("-").map(Number);
  return `${dayLabel.format(Date.UTC(y, m - 1, d))} · ${c.dateOnly ? "Time TBA" : formatClock(c.startsAtMs)}`;
}

/** rm-playlist sends the metro; until it does (or for older rows), a show in one of the three cities counts. */
export const metroOf = (c: { metro: string | null; city: string }): string | null =>
  c.metro ?? ((METROS as readonly string[]).includes(c.city) ? c.city : null);

/** The next few shows, Milwaukee first (spec: Milwaukee shows ranked first), soonest first, each artist once. */
export function inTown<T extends { metro: string | null; city: string; startsAtMs: number; dateOnly?: boolean; artist?: string }>(concerts: T[], n: number): T[] {
  const day = (c: T) => concertDayKey({ startsAtMs: c.startsAtMs, dateOnly: c.dateOnly ?? false });
  // By the day people see (a date-only show sits on its UTC date), then by time.
  const sorted = [...concerts].sort((a, b) => day(a).localeCompare(day(b)) || a.startsAtMs - b.startsAtMs);
  const seen = new Set<string>();
  const once = (c: T) => { const k = (c.artist ?? "").toLowerCase(); if (k && seen.has(k)) return false; seen.add(k); return true; };
  return [...sorted.filter((c) => metroOf(c) === "Milwaukee"), ...sorted.filter((c) => metroOf(c) !== "Milwaukee")].filter(once).slice(0, n);
}
