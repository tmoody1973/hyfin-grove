import Link from "next/link";
import type { ScheduledAiring } from "@/lib/listen/attach";
import { formatRange } from "@/lib/listen/time";
import { ListenLiveButton } from "./ListenLiveButton";

const ART = "size-24 shrink-0 border border-white/40 bg-[#1a1a1a] object-cover";

/** One day's programs in airtime order; the one on air now is marked and offers the live stream. */
export function ScheduleDay({ airings, now }: { airings: ScheduledAiring[]; now: number }) {
  if (airings.length === 0) return <p className="py-10 text-ink-soft">The schedule is on its way.</p>;
  return (
    <ol>
      {airings.map((a) => {
        const live = a.startsAt <= now && now < a.endsAt;
        const art = a.artUrl ?? a.hostCards.find((h) => h.photoUrl)?.photoUrl ?? null;
        return (
          <li key={`${a.name}-${a.startsAt}`} className={`grid gap-5 border-b border-white/25 py-6 sm:grid-cols-[180px_96px_1fr] ${live ? "bg-white/5" : ""}`}>
            <span className="font-mono text-sm">
              {formatRange(a.startsAt, a.endsAt)}
              {live && <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-[#ff0040]">On air now</span>}
            </span>
            {art ? (
              // eslint-disable-next-line @next/next/no-img-element -- small show art / host photos from Payload or Cadence
              <img src={art} alt="" width={96} height={96} loading="lazy" className={ART} />
            ) : (
              <span aria-hidden="true" className={ART} />
            )}
            <div className="min-w-0">
              <h3 className="break-words font-display text-[clamp(22px,2.6vw,32px)] uppercase leading-none">
                {a.show ? <Link href={`/shows/${a.show.slug}`} className="hover:text-[#00ff9f]">{a.name}</Link> : a.name}
              </h3>
              {a.hostCards.length > 0 && (
                <p className="mt-2 text-sm">
                  With{" "}
                  {a.hostCards.map((h, i) => (
                    <span key={h.name}>
                      {i > 0 && " & "}
                      {h.slug ? <Link href={`/hosts/${h.slug}`} className="underline underline-offset-2">{h.name}</Link> : h.name}
                    </span>
                  ))}
                </p>
              )}
              {a.blurb && <p className="mt-2 max-w-[640px] text-ink-soft">{a.blurb}</p>}
              <div className="mt-3 flex flex-wrap gap-2.5">
                {live && <ListenLiveButton />}
                {a.show && <Link href={`/shows/${a.show.slug}`} className="inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]">Show page</Link>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
