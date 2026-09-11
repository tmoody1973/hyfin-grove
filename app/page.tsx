import Image from "next/image";
import Link from "next/link";
import { listStories, metaLine } from "@/lib/cds";

// Render on request so `next build` never needs a live CDS token; the fetch cache in lib/cds.ts still limits calls.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stories = await listStories();
  const [lead, ...rest] = stories;

  return (
    <div className="py-10">
      <section className="rise mb-14">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-ink-soft">A HYFIN interview series</p>
        <h1 className="font-display text-5xl font-light leading-[1.02] tracking-tight sm:text-6xl">
          Women who make the music <em className="not-italic text-accent">first.</em>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-soft">
          Long-form conversations with artists on the rise and legends who paved the way.
          {stories.length ? ` ${stories.length} episodes.` : ""}
        </p>
      </section>

      {lead && (
        <Link href={`/stories/${lead.id}`} className="rise group block" style={{ animationDelay: "80ms" }}>
          <article className="grid gap-6 border-y border-rule py-8 sm:grid-cols-[1.2fr_1fr] sm:items-center">
            {lead.imageWide && (
              <Image
                src={lead.imageWide} alt={lead.imageAlt} width={1440} height={810} priority
                sizes="(min-width: 640px) 60vw, 100vw"
                className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.01]"
              />
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Latest</p>
              <h2 className="font-display mt-2 text-3xl font-medium leading-tight group-hover:underline decoration-1 underline-offset-4">
                {lead.shortTitle}
              </h2>
              {lead.teaser && <p className="mt-3 text-ink-soft">{lead.teaser}</p>}
              <p className="mt-4 text-sm text-ink-soft">
                {metaLine(lead)}
              </p>
            </div>
          </article>
        </Link>
      )}

      <ul className="divide-y divide-rule">
        {rest.map((s, i) => (
          <li key={s.id} className="rise" style={{ animationDelay: `${140 + i * 40}ms` }}>
            <Link href={`/stories/${s.id}`} className="group grid grid-cols-[96px_1fr] gap-5 py-6 sm:grid-cols-[128px_1fr]">
              {s.imageSquare ? (
                <Image
                  src={s.imageSquare} alt={s.imageAlt} width={810} height={810}
                  sizes="128px" className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square w-full bg-paper-deep" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-ink-soft">
                  {metaLine(s)}
                </p>
                <h3 className="font-display mt-1 text-2xl font-medium leading-snug group-hover:underline decoration-1 underline-offset-4">
                  {s.shortTitle}
                </h3>
                {s.teaser && <p className="mt-2 line-clamp-2 text-ink-soft">{s.teaser}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
