"use client";

import { accumulatePlays, groupPlaysByAiring } from "@/lib/listen/group";
import type { Airing, Play } from "@/lib/listen/rmPlaylist";
import { dayPrefix, formatRange } from "@/lib/listen/time";
import { useMemo, useState } from "react";
import { useLiveQuery } from "@/lib/listen/useLiveQuery";
import { PlayRow } from "./PlayRow";

/** Songs shown at first and added per "Show earlier songs" click (~4 hours of HYFIN). */
export const PAGE_SIZE = 60;

type Props = { initial: Play[]; airings: Airing[]; live: boolean; nearbyOnly: boolean; grouped: boolean; fromMs: number; labelDaysFrom?: number };

/** The song list. Today's list subscribes to new plays; past days and searches render as given. */
export function LivePlaylist({ initial, airings, live, nearbyOnly, grouped, fromMs, labelDaysFrom }: Props) {
  const reduce = useMemo(() => accumulatePlays(fromMs), [fromMs]);
  const seen = useLiveQuery("plays:recentByStation", { stationSlug: "hyfin", limit: 30 }, initial, live, reduce);
  const [shown, setShown] = useState(PAGE_SIZE);
  const matching = seen.filter((p) => !nearbyOnly || p.liveEvent);
  const plays = matching.slice(0, shown);
  const more = matching.length > shown && (
    <button
      type="button"
      onClick={() => setShown((n) => n + PAGE_SIZE)}
      className="inline-flex min-h-11 items-center self-start border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]"
    >
      Show earlier songs
    </button>
  );

  if (plays.length === 0) return <p className="py-10 text-ink-soft">{nearbyOnly ? "No artists with shows nearby in this list." : "No songs yet."}</p>;
  if (!grouped) return <div className="flex flex-col gap-6"><ul>{plays.map((p) => <PlayRow key={p.id} play={p} withDate />)}</ul>{more}</div>;

  return (
    <div className="flex flex-col gap-12">
      {groupPlaysByAiring(plays, airings).map((g) => (
        <section key={`${g.airing?.startsAt ?? "none"}-${g.plays.at(-1)!.id}`} aria-label={g.airing?.name ?? "HYFIN"}>
          <div className="flex items-baseline justify-between gap-4 border-b border-white pb-2">
            <h2 className="font-display text-[clamp(24px,3vw,36px)] uppercase leading-none">{g.airing?.name ?? "HYFIN"}</h2>
            <span className="shrink-0 font-mono text-xs text-ink-soft">
              {labelDaysFrom !== undefined && dayPrefix(g.airing?.startsAt ?? g.plays[0].playedAt, labelDaysFrom)}
              {g.airing && formatRange(g.airing.startsAt, g.airing.endsAt)}
            </span>
          </div>
          <ul>{g.plays.map((p) => <PlayRow key={p.id} play={p} />)}</ul>
        </section>
      ))}
      {more}
    </div>
  );
}
