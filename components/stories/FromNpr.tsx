import type { NprItem } from "@/lib/npr/topic";
import type { Card } from "@/lib/stories";
import { StoryCard } from "./StoryCard";

const toCard = (item: NprItem, i: number): Card => ({
  id: i,
  title: item.title,
  href: item.url,
  excerpt: item.teaser,
  byline: null,
  publishedAt: item.publishedAt,
  imageUrl: item.imageUrl,
  imageAlt: "",
  label: "NPR",
});

/** "From NPR: <topic>" (decision 010): NPR stories shown live, each linking to npr.org. Nothing when there are none. */
export function FromNpr({ items, topic }: { items: NprItem[]; topic: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="from-npr" className="flex flex-col gap-6 pb-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-white pt-[22px]">
        <h2 id="from-npr" className="m-0 font-display text-[clamp(30px,3.6vw,52px)] uppercase leading-none">
          From NPR: {topic}
        </h2>
        <span className="font-mono text-xs text-ink-soft">Stories from NPR. Each opens on npr.org.</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
        {items.map((item, i) => (
          <StoryCard key={item.id} card={toCard(item, i)} />
        ))}
      </div>
    </section>
  );
}
