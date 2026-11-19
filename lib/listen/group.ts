import { toPlay, type Airing, type Play } from "./rmPlaylist";

export type PlayGroup = { airing: Airing | null; plays: Play[] };

/** Songs under the show on air when each played, newest first; songs outside every show form their own runs. */
export function groupPlaysByAiring(plays: Play[], airings: Airing[]): PlayGroup[] {
  const groups: PlayGroup[] = [];
  for (const play of [...plays].sort((a, b) => b.playedAt - a.playedAt)) {
    const airing = airings.find((a) => a.startsAt <= play.playedAt && play.playedAt < a.endsAt) ?? null;
    const last = groups.at(-1);
    if (last && last.airing === airing) last.plays.push(play);
    else groups.push({ airing, plays: [play] });
  }
  return groups;
}

/** Today's list: live plays first, then the server's, de-duplicated, nothing from before `fromMs`, newest first. */
export function mergeLive(live: Play[], initial: Play[], fromMs: number): Play[] {
  const byId = new Map<string, Play>();
  for (const p of [...live, ...initial]) if (p.playedAt >= fromMs && !byId.has(p.id)) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => b.playedAt - a.playedAt);
}

/**
 * Reducer for today's live list: each update from the live feed (its latest 30 plays) is merged into
 * everything seen so far, so a song that leaves that window stays on the page.
 */
export const accumulatePlays = (fromMs: number) => (seen: Play[], incoming: Parameters<typeof toPlay>[0][]): Play[] =>
  mergeLive(incoming.map(toPlay), seen, fromMs);
