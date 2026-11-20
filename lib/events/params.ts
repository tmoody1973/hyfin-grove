import { todayKey } from "../listen/time";
import { METROS, type Metro } from "./calendar";
import { isEventType, type EventType } from "./types";

export type EventsParams = { metro: Metro | null; month: string; type: EventType | null };

/** Months the calendar can show: this one through 5 ahead (rm-playlist lists about 3 months of shows). */
export const MONTHS_AHEAD = 5;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const monthIndex = (key: string) => { const [y, m] = key.split("-").map(Number); return y * 12 + (m - 1); };
export const monthKeyOf = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
export const addMonths = (key: string, n: number) => monthKeyOf(monthIndex(key) + n);

export function parseEventsParams(sp: Record<string, string | string[] | undefined>, now: number): EventsParams {
  const current = todayKey(now).slice(0, 7);
  const metro = METROS.find((m) => m.toLowerCase() === first(sp.metro).toLowerCase()) ?? null;
  const asked = first(sp.month);
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) && monthIndex(asked) >= monthIndex(current) && monthIndex(asked) <= monthIndex(current) + MONTHS_AHEAD;
  const type = isEventType(first(sp.type)) ? (first(sp.type) as EventType) : null;
  return { metro, month: valid ? asked : current, type };
}

export function eventsHref(p: EventsParams, currentMonth: string): string {
  const qs = new URLSearchParams();
  if (p.metro) qs.set("metro", p.metro.toLowerCase());
  if (p.month !== currentMonth) qs.set("month", p.month);
  if (p.type) qs.set("type", p.type);
  const s = qs.toString();
  return s ? `/events?${s}` : "/events";
}
