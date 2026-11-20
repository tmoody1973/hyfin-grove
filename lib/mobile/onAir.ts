import type { Airing } from "@/lib/listen/rmPlaylist";
import { formatClock } from "@/lib/listen/time";

/** "Megan Mathews until 5 pm": whoever's on air at `now` (hosts, else the show's name), or null. */
export function onAirLabel(airings: readonly Airing[], now: number): string | null {
  const on = airings.find((a) => a.startsAt <= now && now < a.endsAt);
  return on ? `${on.hosts.join(" & ") || on.name} until ${formatClock(on.endsAt)}` : null;
}
