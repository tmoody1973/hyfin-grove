import Image from "next/image";
import Link from "next/link";
import type { Card } from "@/lib/stories";

const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" });

/** "Paula Lovo · Nov 19, 2026", either half alone, or null when there is neither. */
export function metaLine(card: Pick<Card, "byline" | "publishedAt">): string | null {
  const parts = [card.byline, card.publishedAt ? date.format(new Date(card.publishedAt)) : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** The card's picture box: the image, or a placeholder of exactly the same size. */
export function MediaBox({ card, box, sizes }: { card: Card; box: string; sizes: string }) {
  return (
    <span data-media-box={box} className={`relative block w-full overflow-hidden border border-white bg-paper-deep ${box}`}>
      {card.imageUrl ? (
        <Image src={card.imageUrl} alt={card.imageAlt} fill sizes={sizes} className="object-cover" />
      ) : (
        <span aria-hidden className="absolute bottom-3 left-3 font-display text-lg uppercase text-white/25">
          HYFIN
        </span>
      )}
    </span>
  );
}

export function Label({ text }: { text: string }) {
  return <span className="self-start bg-[#0070ff] px-2 py-[3px] font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-black">{text}</span>;
}

const BOX = { sm: "h-[120px]", md: "h-[190px]" } as const;
const TITLE = { sm: "text-lg", md: "text-[21px]" } as const;

/** A story in a grid (mockup music-page "Latest in music"): picture, label, headline, byline · date. */
export function StoryCard({ card, size = "md" }: { card: Card; size?: "sm" | "md" }) {
  const meta = metaLine(card);
  return (
    <article className="flex min-w-0 flex-col gap-2.5">
      <Link href={card.href} tabIndex={-1} aria-hidden>
        <MediaBox card={card} box={BOX[size]} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
      </Link>
      {card.label && <Label text={card.label} />}
      <h3 className={`m-0 break-words font-semibold leading-tight ${TITLE[size]}`}>
        <Link href={card.href} className="sg-hov inline-block hover:text-[#00ff9f]">
          {card.title}
        </Link>
      </h3>
      {meta && (
        <span data-meta className="font-mono text-xs text-ink-soft">
          {meta}
        </span>
      )}
    </article>
  );
}
