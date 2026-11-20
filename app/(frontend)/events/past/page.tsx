import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";
import { ConcertRow } from "@/components/events/ConcertRow";
import { TypeFilter } from "@/components/events/TypeFilter";
import { pastEvents } from "@/lib/events/store";
import { isEventType, type EventType } from "@/lib/events/types";
import { parsePage } from "@/lib/stories/params";

export const metadata: Metadata = {
  title: "Past events",
  description: "HYFIN's past events and the concerts by artists we play.",
  alternates: { canonical: "/events/past" },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** /events/past keeps its type filter across pages: /events/past?type=party&page=2. */
function pastHref(type: EventType | null, page = 1): string {
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/events/past?${s}` : "/events/past";
}

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

const PAGER = "inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] hover:bg-white hover:text-black";

/** Plan 9: every past event, newest first, 24 to a page. Cancelled shows are left out. */
export default async function PastEventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const now = await requestTime();
  const sp = await searchParams;
  const page = parsePage(sp);
  if (page === null) notFound();
  const type = isEventType(one(sp.type)) ? (one(sp.type) as EventType) : null;
  const db = await getPayload({ config });
  const { events, totalPages } = await pastEvents(db, { now, type, page });
  if (page > 1 && page > totalPages) notFound();

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <header className="border-b border-white pb-7">
        <p className="font-mono text-xs text-ink-soft">
          <Link href="/events" className="hover:text-[#00ff9f]">/events</Link>/past
        </p>
        <h1 className="sg-fx sg-lines mt-3 font-display text-[clamp(48px,8vw,104px)] uppercase leading-[0.85] tracking-[-0.02em]">Past events</h1>
        <TypeFilter current={type} hrefFor={(t) => pastHref(t)} />
      </header>
      {events.length === 0 ? (
        <p className="py-10 text-ink-soft">No past events{type ? " of this type" : ""} yet.</p>
      ) : (
        <ul>{events.map((c) => <ConcertRow key={c.id} concert={c} label={c.type === "concert" ? undefined : c.typeLabel} />)}</ul>
      )}
      {totalPages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center gap-4">
          {page > 1 && <Link href={pastHref(type, page - 1)} rel="prev" className={PAGER}>Newer</Link>}
          <span className="font-mono text-xs text-ink-soft">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={pastHref(type, page + 1)} rel="next" className={PAGER}>Older</Link>}
        </nav>
      )}
    </div>
  );
}
