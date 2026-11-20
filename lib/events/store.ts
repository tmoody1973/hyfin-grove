import type { Payload, Where } from "payload";
import { todayKey } from "../listen/time";
import { concertDayKey } from "./calendar";
import { eventPath } from "./links";
import type { Concert } from "./rmEvents";
import { typeLabel, type EventType } from "./types";

/**
 * Reading Events (plan 9). An EventView is concert-shaped, so the existing row, calendar, "In town" and event-state
 * helpers work on stored events of every type.
 */
export type EventView = Concert & {
  type: EventType;
  typeLabel: string;
  href: string;
  featured: boolean;
  source: "rm-playlist" | "staff";
  endsAtMs: number | null;
};

type Media = { url?: string | null } | number | null | undefined;
export type EventDoc = {
  id: number;
  slug?: string | null;
  title: string;
  type: EventType;
  source: "rm-playlist" | "staff";
  startsAt: string;
  endsAt?: string | null;
  dateOnly?: boolean | null;
  venue?: string | null;
  city?: string | null;
  metro?: string | null;
  ticketUrl?: string | null;
  imageUrl?: string | null;
  image?: Media;
  artist?: string | null;
  headliners?: string[] | null;
  supports?: string[] | null;
  eventStatus?: "scheduled" | "cancelled" | "postponed" | null;
  playCount?: number | null;
  featured?: boolean | null;
};

const mediaUrl = (m: Media): string | null => (m && typeof m === "object" && m.url ? m.url : null);

export function toEventView(d: EventDoc): EventView {
  const slug = d.slug || String(d.id);
  const endsAtMs = d.endsAt ? Date.parse(d.endsAt) : null;
  return {
    id: slug,
    title: d.title,
    artist: d.artist ?? "",
    headliners: d.headliners ?? [],
    supports: d.supports ?? [],
    venue: d.venue ?? "",
    city: d.city ?? "",
    region: null,
    metro: d.metro ?? null,
    startsAtMs: Date.parse(d.startsAt),
    dateOnly: Boolean(d.dateOnly),
    doorsAt: null,
    genre: null,
    imageUrl: mediaUrl(d.image) ?? d.imageUrl ?? null,
    ticketUrl: d.ticketUrl ?? null,
    playCount: d.playCount ?? null,
    status: d.eventStatus && d.eventStatus !== "scheduled" ? d.eventStatus : null,
    type: d.type,
    typeLabel: typeLabel(d.type),
    href: eventPath(slug),
    featured: Boolean(d.featured),
    source: d.source,
    endsAtMs: endsAtMs !== null && !Number.isNaN(endsAtMs) ? endsAtMs : null,
  };
}

const SHOW_LENGTH_MS = 6 * 3_600_000;
const PUBLIC: Where[] = [{ _status: { equals: "published" } }, { hidden: { not_equals: true } }];

/** Same rule as lib/events/eventPage.ts: date-only events last their whole (UTC-stored) day; timed ones 6 hours, or to endsAt. */
function window(now: number) {
  return { dayStart: `${todayKey(now)}T00:00:00.000Z`, sixHoursAgo: new Date(now - SHOW_LENGTH_MS).toISOString(), nowIso: new Date(now).toISOString() };
}

export function upcomingWhere(now: number, type?: EventType | null): Where {
  const { dayStart, sixHoursAgo, nowIso } = window(now);
  return {
    and: [
      ...PUBLIC,
      { eventStatus: { equals: "scheduled" } },
      {
        or: [
          { and: [{ dateOnly: { equals: true } }, { startsAt: { greater_than_equal: dayStart } }] },
          { and: [{ dateOnly: { not_equals: true } }, { startsAt: { greater_than: sixHoursAgo } }] },
          { endsAt: { greater_than: nowIso } },
        ],
      },
      ...(type ? [{ type: { equals: type } }] : []),
    ],
  };
}

export function pastWhere(now: number, type?: EventType | null): Where {
  const { dayStart, sixHoursAgo, nowIso } = window(now);
  return {
    and: [
      ...PUBLIC,
      { eventStatus: { not_equals: "cancelled" } },
      {
        or: [
          { and: [{ dateOnly: { equals: true } }, { startsAt: { less_than: dayStart } }] },
          { and: [{ dateOnly: { not_equals: true } }, { startsAt: { less_than_equal: sixHoursAgo } }] },
        ],
      },
      { or: [{ endsAt: { exists: false } }, { endsAt: { less_than_equal: nowIso } }] },
      ...(type ? [{ type: { equals: type } }] : []),
    ],
  };
}

type Db = Pick<Payload, "find">;
const VIEW_SELECT = {
  slug: true, title: true, type: true, source: true, startsAt: true, endsAt: true, dateOnly: true, venue: true, city: true, metro: true,
  ticketUrl: true, imageUrl: true, image: true, artist: true, headliners: true, supports: true, eventStatus: true, playCount: true, featured: true,
} as const;

/** Soonest first; on the same day, featured events lead. */
export async function upcomingEvents(db: Db, { now, type, limit = 200 }: { now: number; type?: EventType | null; limit?: number }): Promise<EventView[]> {
  const { docs } = await db.find({ collection: "events", where: upcomingWhere(now, type), sort: "startsAt", limit, depth: 1, select: VIEW_SELECT, populate: { media: { url: true, filename: true } } });
  const views = (docs as unknown as EventDoc[]).map(toEventView);
  const day = (e: EventView) => concertDayKey(e);
  return views.sort((a, b) => day(a).localeCompare(day(b)) || Number(b.featured) - Number(a.featured) || a.startsAtMs - b.startsAtMs);
}

/** Newest first, 24 to a page. */
export async function pastEvents(db: Db, { now, type, page, perPage = 24 }: { now: number; type?: EventType | null; page: number; perPage?: number }) {
  const r = await db.find({ collection: "events", where: pastWhere(now, type), sort: "-startsAt", page, limit: perPage, depth: 1, select: VIEW_SELECT, populate: { media: { url: true, filename: true } } });
  return { events: (r.docs as unknown as EventDoc[]).map(toEventView), totalPages: r.totalPages };
}

type RichData = Record<string, unknown> | null;
type Photo = { url: string; alt: string };
type RelatedPost = { id: number; title: string; slug: string; category: string; publishedAt?: string | null; excerpt?: string | null };
export type EventFull = { view: EventView; description: RichData; recap: RichData; priceText: string | null; address: string | null; gallery: Photo[]; related: RelatedPost[] };

/** One public event by its address, with the staff-written parts; null when there's no such published event. */
export async function eventBySlug(db: Db, slug: string): Promise<EventFull | null> {
  const { docs } = await db.find({
    collection: "events",
    where: { and: [...PUBLIC, { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
    select: { ...VIEW_SELECT, description: true, recap: true, priceText: true, address: true, gallery: true, relatedPosts: true },
    populate: { media: { url: true, filename: true, alt: true }, posts: { title: true, slug: true, category: true, publishedAt: true, excerpt: true } },
  });
  const d = docs[0] as unknown as (EventDoc & { description?: RichData; recap?: RichData; priceText?: string | null; address?: string | null; gallery?: unknown[]; relatedPosts?: unknown[] }) | undefined;
  if (!d) return null;
  const objects = <T>(xs: unknown[] | undefined) => (xs ?? []).filter((x): x is T => !!x && typeof x === "object");
  return {
    view: toEventView(d),
    description: d.description ?? null,
    recap: d.recap ?? null,
    priceText: d.priceText ?? null,
    address: d.address ?? null,
    gallery: objects<{ url?: string | null; alt?: string | null }>(d.gallery).filter((m) => m.url).map((m) => ({ url: String(m.url), alt: m.alt ?? "" })),
    related: objects<RelatedPost>(d.relatedPosts),
  };
}
