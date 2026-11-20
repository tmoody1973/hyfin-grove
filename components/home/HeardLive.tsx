import Link from "next/link";
import { formatConcertWhen } from "@/lib/events/calendar";
import { eventPath, safeTicketUrl } from "@/lib/events/links";
import type { Concert } from "@/lib/events/rmEvents";

const BTN = "inline-flex min-h-11 shrink-0 items-center px-[18px] font-mono text-xs font-semibold uppercase tracking-[0.08em]";

/** "Heard on HYFIN. Live in Milwaukee." (mockup homepage.html, minus ticket giveaways): the next few shows. */
export function HeardLive({ concerts }: { concerts: Concert[] }) {
  if (concerts.length === 0) return null;
  return (
    <section aria-labelledby="heard-live" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-4 border-t border-white pt-[22px]">
        <div className="flex flex-[1_1_520px] items-baseline gap-4">
          <span className="font-mono text-[13px] text-[#ff0040]">04</span>
          <h2 id="heard-live" className="sg-lines m-0 font-display text-[clamp(34px,4.4vw,60px)] uppercase leading-none tracking-[-0.02em] [text-wrap:balance]">
            Heard on HYFIN. Live in Milwaukee.
          </h2>
        </div>
        <p className="m-0 max-w-[420px] flex-[1_1_300px] font-mono text-[13px] leading-normal text-ink-soft">Artists in rotation with dates on the books, matched straight from the playlist.</p>
      </div>
      <ul className="flex flex-col">
        {concerts.map((c) => {
          const tickets = safeTicketUrl(c.ticketUrl);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-rule py-5">
              <span className="shrink-0 basis-[170px] whitespace-nowrap font-mono text-sm text-[#ff0040]">{formatConcertWhen(c)}</span>
              <Link href={eventPath(c.id)} className="min-w-0 flex-[2_1_280px] break-words font-display text-[clamp(26px,2.8vw,38px)] uppercase leading-none hover:text-[#00ff9f]">
                {c.artist}
              </Link>
              <span className="flex-[1_1_200px] text-[17px]">
                {c.venue}, {c.city}
              </span>
              {tickets ? (
                <a href={tickets} target="_blank" rel="noopener noreferrer" className={`${BTN} bg-white text-black`}>
                  Tickets
                </a>
              ) : (
                <Link href={eventPath(c.id)} className={`${BTN} border border-white`}>
                  Details
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/events" className="self-start font-mono text-xs uppercase tracking-[0.08em] underline underline-offset-4 hover:text-[#00ff9f]">
        All events →
      </Link>
    </section>
  );
}
