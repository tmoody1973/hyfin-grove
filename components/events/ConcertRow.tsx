import Link from "next/link";
import { formatConcertWhen } from "@/lib/events/calendar";
import { eventPath, safeTicketUrl } from "@/lib/events/links";
import type { Concert } from "@/lib/events/rmEvents";

const IMG = "size-24 shrink-0 border border-white/40 bg-[#1a1a1a] object-cover";

/** One upcoming show: image, when, title (to its event page), where, lineup, HYFIN plays, Tickets. */
export function ConcertRow({ concert: c }: { concert: Concert }) {
  const tickets = safeTicketUrl(c.ticketUrl);
  return (
    <li className="grid grid-cols-[96px_1fr] gap-x-5 gap-y-3 border-b border-white/25 py-6 sm:grid-cols-[96px_1fr_auto] sm:items-center">
      {c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- event images from the ticket source
        <img src={c.imageUrl} alt="" width={96} height={96} loading="lazy" className={IMG} />
      ) : (
        <span data-image-placeholder="true" aria-hidden="true" className={IMG} />
      )}
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#ff0040]">{formatConcertWhen(c)}</p>
        <h3 className="mt-1 break-words font-display text-[clamp(22px,2.4vw,30px)] uppercase leading-[0.95]">
          <Link href={eventPath(c.id)} className="hover:text-[#00ff9f]">{c.title}</Link>
        </h3>
        <p className="mt-1.5 text-ink-soft">
          {c.venue}, {c.city}
          {c.supports.length > 0 && <span> · with {c.supports.join(", ")}</span>}
        </p>
        {c.playCount !== null && c.playCount > 0 && (
          <span className="mt-2 inline-block border border-[#ff0040] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff0040]">
            In rotation · {c.playCount} {c.playCount === 1 ? "play" : "plays"}
          </span>
        )}
      </div>
      {tickets && (
        <a
          href={tickets}
          target="_blank"
          rel="noopener noreferrer"
          className="col-start-2 inline-flex min-h-11 items-center justify-self-start bg-[#ff0040] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-black hover:bg-white sm:col-start-3"
        >
          Tickets
        </a>
      )}
    </li>
  );
}
