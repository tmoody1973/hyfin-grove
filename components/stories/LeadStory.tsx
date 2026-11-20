import Link from "next/link";
import type { Card } from "@/lib/stories";
import { Label, MediaBox, metaLine } from "./StoryCard";

const LONG_TITLE = 80;

/** The lead story (mockup music-page "Lead story"): big picture beside label, headline, dek, byline and a button. */
/** `slice`: during bursts, bands of the headline shift sideways (home cover only). */
export function LeadStory({ card, cta = "Read the story", slice = false }: { card: Card; cta?: string; slice?: boolean }) {
  const meta = metaLine(card);
  // ponytail: character count stands in for measuring the rendered lines; tune LONG_TITLE if headlines still overflow.
  const size = card.title.length > LONG_TITLE ? "long" : "big";
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-7">
      <Link href={card.href} transitionTypes={["nav-forward"]} tabIndex={-1} aria-hidden className="min-w-0 flex-[3_1_480px]">
        <MediaBox card={card} box="h-[260px] md:h-[380px]" sizes="(min-width: 1024px) 60vw, 100vw" />
      </Link>
      <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
        {card.label && <Label text={card.label} />}
        <h2 data-title-size={size} data-text={slice ? card.title : undefined} className={`sg-fx ${slice ? "sg-slice " : ""}m-0 break-words font-display uppercase leading-none ${size === "long" ? "text-[clamp(24px,2.2vw,32px)]" : "text-[clamp(32px,3.6vw,52px)]"}`}>
          <Link href={card.href} transitionTypes={["nav-forward"]} className="hover:text-[#00ff9f]">
            {card.title}
          </Link>
        </h2>
        {card.excerpt && <p className="m-0 text-[19px] leading-snug text-[#e6e6e6]">{card.excerpt}</p>}
        {meta && <span className="font-mono text-xs text-ink-soft">{meta}</span>}
        <Link href={card.href} transitionTypes={["nav-forward"]} className="inline-flex min-h-12 items-center self-start bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">
          {cta}
        </Link>
      </div>
    </div>
  );
}
