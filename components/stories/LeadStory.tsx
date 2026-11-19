import Link from "next/link";
import type { Card } from "@/lib/stories";
import { Label, MediaBox, metaLine } from "./StoryCard";

/** The lead story (mockup music-page "Lead story"): big picture beside label, headline, dek, byline and a button. */
export function LeadStory({ card, cta = "Read the story" }: { card: Card; cta?: string }) {
  const meta = metaLine(card);
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-7">
      <Link href={card.href} tabIndex={-1} aria-hidden className="min-w-0 flex-[3_1_480px]">
        <MediaBox card={card} box="h-[260px] md:h-[380px]" sizes="(min-width: 1024px) 60vw, 100vw" />
      </Link>
      <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
        {card.label && <Label text={card.label} />}
        <h2 className="m-0 break-words font-display text-[clamp(32px,3.6vw,52px)] uppercase leading-none">
          <Link href={card.href} className="hover:text-[#00ff9f]">
            {card.title}
          </Link>
        </h2>
        {card.excerpt && <p className="m-0 text-[19px] leading-snug text-[#e6e6e6]">{card.excerpt}</p>}
        {meta && <span className="font-mono text-xs text-ink-soft">{meta}</span>}
        <Link href={card.href} className="inline-flex min-h-12 items-center self-start bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">
          {cta}
        </Link>
      </div>
    </div>
  );
}
