"use client";

import { groupPlaysByAiring, mergeLive } from "@/lib/listen/group";
import { toPlay, type Airing, type Play } from "@/lib/listen/rmPlaylist";
import { formatRange } from "@/lib/listen/time";
import { useLiveQuery } from "@/lib/listen/useLiveQuery";
import { PlayRow } from "./PlayRow";

type Props = { initial: Play[]; airings: Airing[]; live: boolean; nearbyOnly: boolean; grouped: boolean; fromMs: number };

/** The song list. Today's list subscribes to new plays; past days and searches render as given. */
export function LivePlaylist({ initial, airings, live, nearbyOnly, grouped, fromMs }: Props) {
  const recent = useLiveQuery<Parameters<typeof toPlay>[0][]>("plays:recentByStation", { stationSlug: "hyfin", limit: 30 }, [], live);
  const merged = live ? mergeLive(recent.map(toPlay), initial, fromMs) : initial;
  const plays = merged.filter((p) => !nearbyOnly || p.liveEvent);

  if (plays.length === 0) return <p className="py-10 text-ink-soft">{nearbyOnly ? "No artists with shows nearby in this list." : "No songs yet."}</p>;
  if (!grouped) return <ul>{plays.map((p) => <PlayRow key={p.id} play={p} withDate />)}</ul>;

  return (
    <div className="flex flex-col gap-12">
      {groupPlaysByAiring(plays, airings).map((g) => (
        <section key={`${g.airing?.startsAt ?? "none"}-${g.plays[0].id}`} aria-label={g.airing?.name ?? "HYFIN"}>
          <div className="flex items-baseline justify-between gap-4 border-b border-white pb-2">
            <h2 className="font-display text-[clamp(24px,3vw,36px)] uppercase leading-none">{g.airing?.name ?? "HYFIN"}</h2>
            {g.airing && <span className="shrink-0 font-mono text-xs text-ink-soft">{formatRange(g.airing.startsAt, g.airing.endsAt)}</span>}
          </div>
          <ul>{g.plays.map((p) => <PlayRow key={p.id} play={p} />)}</ul>
        </section>
      ))}
    </div>
  );
}
