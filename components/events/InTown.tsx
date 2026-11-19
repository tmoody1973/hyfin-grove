import Link from "next/link";
import { formatConcertWhen } from "@/lib/events/calendar";
import { eventPath } from "@/lib/events/links";
import type { Concert } from "@/lib/events/rmEvents";

/** The playlist mockup's "In rotation, in town" sidebar: the next few shows, Milwaukee first. */
export function InTown({ concerts }: { concerts: Concert[] }) {
  if (concerts.length === 0) return null;
  return (
    <section aria-labelledby="in-town-heading">
      <h2 id="in-town-heading" className="border-b border-white pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">In rotation, in town</h2>
      <ul>
        {concerts.map((c) => (
          <li key={c.id} className="border-b border-white/25 py-4">
            <Link href={eventPath(c.id)} className="group block">
              <span className="block break-words font-display text-xl uppercase leading-none group-hover:text-[#00ff9f]">{c.artist}</span>
              <span className="mt-1.5 block font-mono text-xs text-[#ff0040]">{formatConcertWhen(c)} · {c.venue}, {c.city}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/events" className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.1em] underline underline-offset-4 hover:text-[#00ff9f]">All events →</Link>
    </section>
  );
}
