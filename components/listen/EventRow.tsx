import type { LiveEvent } from "@/lib/listen/rmPlaylist";
import { formatEventDate } from "@/lib/listen/time";

/** Ticket links come from Ticketmaster/AXS via rm-playlist; only web links become buttons. */
const safeTicketUrl = (url: string | null): string | null => (url && /^https?:\/\//i.test(url) ? url : null);

/**
 * An upcoming concert by the artist just played, as its own highlighted row (the rm-playlist widget's
 * LIVE row, Tarik 2026-11-19). Plan 5 links the title to the event's page on this site.
 */
export function EventRow({ event, artist, fallbackArt }: { event: LiveEvent; artist: string; fallbackArt: string | null }) {
  const art = event.imageUrl ?? fallbackArt;
  const tickets = safeTicketUrl(event.ticketUrl);
  return (
    <div className="col-span-full mt-2 flex items-center gap-4 border-l-4 border-[#f5b82e] bg-[#2a2112] px-4 py-3">
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element -- small event image from the ticket source
        <img src={art} alt="" width={56} height={56} loading="lazy" className="size-14 shrink-0 object-cover" />
      ) : (
        <span aria-hidden="true" className="size-14 shrink-0 bg-[#3a2e18]" />
      )}
      <span className="shrink-0 font-mono text-sm font-semibold tracking-[0.12em] text-[#f5b82e]">LIVE</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold">{event.title ?? `${artist} live`}</span>
        <span className="block text-sm text-ink-soft">
          {event.venue}, {event.city} · {formatEventDate(event)}
        </span>
      </span>
      {tickets && (
        <a
          href={tickets}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center border border-[#ff5a36] px-4 text-sm text-[#ff5a36] hover:bg-[#ff5a36] hover:text-black"
        >
          Tickets
        </a>
      )}
    </div>
  );
}
