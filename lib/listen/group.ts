import type { Airing, Play } from "./rmPlaylist";

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
