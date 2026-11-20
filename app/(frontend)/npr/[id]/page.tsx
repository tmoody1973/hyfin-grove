import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PlayButton } from "@/components/player/PlayButton";
import { CdsBody } from "@/components/story/CdsBody";
import { getNprStory } from "@/lib/npr/topic";

const story = cache((id: string) => getNprStory(id));
const dateLine = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });

export async function generateMetadata({ params }: PageProps<"/npr/[id]">): Promise<Metadata> {
  const s = await story((await params).id);
  if (!s) return {};
  // npr.org is the original: search engines should credit and rank that copy (decision 010).
  return {
    title: s.title,
    description: s.teaser ?? undefined,
    alternates: { canonical: s.canonicalUrl },
    openGraph: { type: "article", title: s.title, description: s.teaser ?? undefined, ...(s.imageUrl ? { images: [s.imageUrl] } : {}) },
  };
}

/** An NPR story shown on HYFIN, read live from CDS and never stored (decision 010). Same layout as our story pages. */
export default async function NprStoryPage({ params }: PageProps<"/npr/[id]">) {
  const { id } = await params;
  const s = await story(id);
  if (!s) notFound();
  const href = `/npr/${encodeURIComponent(s.id)}`;

  return (
    <article>
      <section className="px-[clamp(20px,4vw,60px)] pt-11">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-[22px]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="bg-[#0070ff] px-2 py-[3px] font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-black">NPR</span>
            <span className="font-mono text-xs text-ink-soft">
              {dateLine(s.publishedAt)}
              {s.byline ? ` · By ${s.byline}` : ""}
            </span>
          </div>
          <h1 className="sg-fx max-w-[1100px] font-display text-[clamp(40px,6.2vw,92px)] uppercase leading-[0.95] tracking-[-0.02em] [text-wrap:balance]">{s.title}</h1>
          {s.teaser && <p className="max-w-[760px] text-[clamp(19px,1.6vw,23px)] leading-[1.4] text-[#e6e6e6] [text-wrap:pretty]">{s.teaser}</p>}
          {s.audio && (
            <div>
              <PlayButton url={s.audio.url} title={s.title} href={href} />
            </div>
          )}
        </div>
      </section>

      {s.imageUrl && (
        <figure className="mx-auto mt-10 max-w-[1320px] px-[clamp(20px,4vw,60px)]">
          <Image src={s.imageUrl} alt={s.imageAlt ?? ""} width={1440} height={810} priority sizes="(min-width: 1440px) 1320px, 100vw" className="w-full border border-white" />
          {(s.imageCaption || s.imageCredit) && (
            <figcaption className="mt-2 font-mono text-xs text-ink-soft">{[s.imageCaption, s.imageCredit].filter(Boolean).join(" · ")}</figcaption>
          )}
        </figure>
      )}

      <section className="px-[clamp(20px,4vw,60px)] pt-10">
        <div className="mx-auto max-w-[1320px]">
          <CdsBody blocks={s.body} className="story-body max-w-[720px] text-[19px] leading-[1.6]" />
          <p className="mt-12 max-w-[720px] border-t border-rule pt-6 font-mono text-xs text-ink-soft">
            This story was published by NPR.{" "}
            <a href={s.canonicalUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">
              Read it on npr.org
            </a>
          </p>
        </div>
      </section>
    </article>
  );
}
