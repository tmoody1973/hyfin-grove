import { todayKey } from "../listen/time";

const words = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A staff event's address: its title plus its Milwaukee date, so the same title on two nights never clashes. */
export function staffEventSlug(title: string, startsAt: string): string {
  return `${words(title) || "event"}-${todayKey(Date.parse(startsAt))}`;
}

type SlugData = { source?: unknown; externalId?: unknown; slug?: unknown; title?: unknown; startsAt?: unknown };

/**
 * The `slugify` given to Payload's slugField() for events (it runs on create, then the address stays put unless an
 * editor ticks "regenerate"). Synced concerts keep their rm-playlist id, so existing /events/<id> links never break.
 */
export function eventSlugify({ data }: { data: SlugData }): string | undefined {
  if (data.source === "rm-playlist" && data.externalId) return String(data.externalId);
  if (typeof data.slug === "string" && words(data.slug)) return words(data.slug);
  const title = typeof data.title === "string" ? data.title : "";
  if (typeof data.startsAt === "string" && !Number.isNaN(Date.parse(data.startsAt))) return staffEventSlug(title, data.startsAt);
  return words(title) || undefined;
}
