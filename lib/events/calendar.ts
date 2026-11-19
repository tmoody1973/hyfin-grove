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
