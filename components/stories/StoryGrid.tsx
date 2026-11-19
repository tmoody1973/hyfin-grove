import Link from "next/link";
import type { Card } from "@/lib/stories";
import { pageHref } from "@/lib/stories/params";
import { StoryCard } from "./StoryCard";

const PAGER = "inline-flex min-h-11 items-center border border-white px-[18px]";

/** A paged grid of story cards with Newer/Older links (section, tag and show lists). */
export function StoryGrid({ cards, page, totalPages, path }: { cards: Card[]; page: number; totalPages: number; path: string }) {
  return (
    <>
      {cards.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
          {cards.map((c) => (
            <StoryCard key={c.id} card={c} />
          ))}
        </div>
      ) : (
        <p className="text-ink-soft">No stories here yet.</p>
      )}
      {totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.08em]">
          {page > 1 && (
            <Link href={pageHref(path, page - 1)} rel="prev" className={PAGER}>
              Newer
            </Link>
          )}
          <span className="text-ink-soft">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(path, page + 1)} rel="next" className={PAGER}>
              Older
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
