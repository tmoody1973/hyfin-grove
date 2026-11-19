import { todayKey } from "../listen/time";
import { concertDayKey } from "./calendar";
import { safeTicketUrl } from "./links";
import type { Concert } from "./rmEvents";

export type EventState = "upcoming" | "passed" | "cancelled" | "postponed";

/** A timed show counts as over this long after it starts. */
const SHOW_LENGTH_MS = 6 * 3_600_000;

export function eventState(c: Concert, now: number): EventState {
  if (c.status === "cancelled") return "cancelled";
  if (c.status === "postponed") return "postponed";
  const over = c.dateOnly ? concertDayKey(c) < todayKey(now) : now > c.startsAtMs + SHOW_LENGTH_MS;
  return over ? "passed" : "upcoming";
}

const STATUS_URL: Record<EventState, string> = {
  upcoming: "https://schema.org/EventScheduled",
  passed: "https://schema.org/EventScheduled",
  cancelled: "https://schema.org/EventCancelled",
  postponed: "https://schema.org/EventPostponed",
};

/** schema.org MusicEvent, so search engines can show the concert as an event. */
export function eventJsonLd(c: Concert, url: string, now: number): Record<string, unknown> {
  const state = eventState(c, now);
  const tickets = safeTicketUrl(c.ticketUrl);
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: c.title,
    url,
    startDate: c.dateOnly ? concertDayKey(c) : new Date(c.startsAtMs).toISOString(),
    eventStatus: c.status === "rescheduled" && state === "upcoming" ? "https://schema.org/EventRescheduled" : STATUS_URL[state],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: c.venue,
      address: { "@type": "PostalAddress", addressLocality: c.city, ...(c.region ? { addressRegion: c.region } : {}) },
    },
    performer: (c.headliners.length + c.supports.length > 0 ? [...c.headliners, ...c.supports] : [c.artist]).map((name) => ({ "@type": "MusicGroup", name })),
    ...(c.imageUrl ? { image: [c.imageUrl] } : {}),
    ...(state === "upcoming" && tickets
      ? { offers: { "@type": "Offer", url: tickets, availability: c.status === "soldOut" ? "https://schema.org/SoldOut" : "https://schema.org/InStock" } }
      : {}),
  };
}

/**
 * The single-event lookup credits the headliner; the station list knows which act HYFIN actually plays (an
 * opener, say), its play count and metro. Use the lookup for status and details, the list for HYFIN's view.
 */
export function mergeConcert(fromLookup: Concert | null, fromList: Concert | undefined): Concert | null {
  if (fromLookup && fromList) return { ...fromLookup, artist: fromList.artist, playCount: fromList.playCount, metro: fromList.metro };
  return fromLookup ?? fromList ?? null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-name, case-insensitive match ("Tems" is in "Wizkid feat. Tems", not in "Systems"). Blank never matches. */
export function artistMatches(name: string, text: string): boolean {
  const n = name.trim();
  if (!n) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(n)}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

/** rm-playlist's list has no clock (the widget trims it); drop shows that started or were called off. */
export const upcomingOnly = <T extends Concert>(concerts: T[], now: number): T[] => concerts.filter((c) => eventState(c, now) === "upcoming");
