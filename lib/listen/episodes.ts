import { normalizeName } from "./attach";
import type { Airing } from "./rmPlaylist";

/** Airings of one program that have started (an in-progress one first), newest first, at most `n`. */
export function episodesFor(airings: Airing[], cadenceProgramName: string, now: number, n: number): Airing[] {
  const name = normalizeName(cadenceProgramName);
  return airings
    .filter((a) => normalizeName(a.name) === name && a.startsAt <= now)
    .sort((a, b) => b.startsAt - a.startsAt)
    .slice(0, n);
}
