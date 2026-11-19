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
    eventStatus: STATUS_URL[state],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: c.venue,
      address: { "@type": "PostalAddress", addressLocality: c.city, ...(c.region ? { addressRegion: c.region } : {}) },
    },
    performer: [...c.headliners, ...c.supports].map((name) => ({ "@type": "MusicGroup", name })),
    ...(c.imageUrl ? { image: [c.imageUrl] } : {}),
    ...(state === "upcoming" && tickets ? { offers: { "@type": "Offer", url: tickets } } : {}),
  };
}
