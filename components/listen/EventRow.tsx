import type { LiveEvent } from "@/lib/listen/rmPlaylist";
import Link from "next/link";
import { eventPath, safeTicketUrl } from "@/lib/events/links";
import { formatEventDate } from "@/lib/listen/time";


/**
 * An upcoming concert by the artist just played, as its own highlighted row (the rm-playlist widget's
 * LIVE row, Tarik 2026-11-19), in the site's on-air red rather than the widget's gold. The title opens the event's page on this site; Tickets goes to the ticket site.
 */
export function EventRow({ event, artist, fallbackArt }: { event: LiveEvent; artist: string; fallbackArt: string | null }) {
  const art = event.imageUrl ?? fallbackArt;
  const tickets = safeTicketUrl(event.ticketUrl);
  return (
    <div className="col-span-full mt-2 flex items-center gap-4 border-l-4 border-[#ff0040] bg-[#26000a] px-4 py-3">
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element -- small event image from the ticket source
        <img src={art} alt="" width={56} height={56} loading="lazy" className="size-14 shrink-0 object-cover" />
      ) : (
        <span aria-hidden="true" className="size-14 shrink-0 bg-[#3d0010]" />
      )}
      <span className="shrink-0 font-mono text-sm font-semibold tracking-[0.12em] text-[#ff0040]">LIVE</span>
      <span className="min-w-0 flex-1">
        <Link href={eventPath(event.eventId)} className="block break-words font-semibold hover:text-[#00ff9f]">{event.title ?? `${artist} live`}</Link>
        <span className="block text-sm text-ink-soft">
          {event.venue}, {event.city} · {formatEventDate(event)}
        </span>
      </span>
      {tickets && (
        <a
          href={tickets}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center bg-[#ff0040] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-black hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff9f]"
        >
          Tickets
        </a>
      )}
    </div>
  );
}
