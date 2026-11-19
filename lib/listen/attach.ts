/** Joins Cadence airings to what staff keep in Payload. Payload wins; nothing is matched by guesswork. */
import type { Airing } from "./rmPlaylist";
import { formatRange, weekdayOf } from "./time";

export type ShowLite = { slug: string; name: string; cadenceProgramName: string | null; description: string | null; artworkUrl: string | null };
export type HostLite = { slug: string; name: string; cadenceHostName: string | null; photoUrl: string | null };
export type HostCard = { name: string; slug: string | null; photoUrl: string | null };
export type ScheduledAiring = Airing & { show: ShowLite | null; hostCards: HostCard[]; artUrl: string | null; blurb: string | null };

/** Lowercase, single spaces, no leading "DJ ": "DJ  Megan Mathews " → "megan mathews". */
export const normalizeName = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/^dj /, "");

export function attachPayload(airings: Airing[], shows: ShowLite[], hosts: HostLite[]): ScheduledAiring[] {
  const showBy = new Map(shows.filter((s) => s.cadenceProgramName).map((s) => [normalizeName(s.cadenceProgramName!), s]));
  const hostBy = new Map(hosts.filter((h) => h.cadenceHostName).map((h) => [normalizeName(h.cadenceHostName!), h]));
  return airings.map((a) => {
    const show = showBy.get(normalizeName(a.name)) ?? null;
    const hostCards = a.hosts.map((name): HostCard => {
      const h = hostBy.get(normalizeName(name));
      return h ? { name: h.name, slug: h.slug, photoUrl: h.photoUrl } : { name: name.trim(), slug: null, photoUrl: null };
    });
    return { ...a, name: show?.name ?? a.name, show, hostCards, artUrl: show?.artworkUrl ?? a.imageUrl, blurb: show?.description ?? a.description };
  });
}

const DAY_PLURALS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/** "Fridays, 10 pm to 12 am" when every airing falls on one weekday; otherwise null. */
export function weeklyLabel(airings: Airing[]): string | null {
  if (airings.length === 0) return null;
  const days = new Set(airings.map((a) => weekdayOf(a.startsAt)));
  if (days.size !== 1) return null;
  return `${DAY_PLURALS[[...days][0]]}, ${formatRange(airings[0].startsAt, airings[0].endsAt)}`;
}
