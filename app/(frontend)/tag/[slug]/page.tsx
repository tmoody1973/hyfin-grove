import type { Metadata } from "next";
import { notFound } from "next/navigation";
import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { getPostPage, resolveTag } from "@/lib/stories";
import { pageHref, parsePage } from "@/lib/stories/params";
import { tagDescription } from "@/lib/taxonomy";

const PER_PAGE = 24;
const tagBySlug = cache(async (slug: string) => resolveTag(await getPayload({ config }), slug));
/** "Arts: visual art, theater…" → the part after the name, as a sentence. */
const definition = (slug: string) => tagDescription(slug).replace(/^[^:]+:\s*/, "");

export async function generateMetadata({ params, searchParams }: PageProps<"/tag/[slug]">): Promise<Metadata> {
  const tag = await tagBySlug((await params).slug);
  if (!tag) return {};
  const page = parsePage(await searchParams) ?? 1;
  const d = definition(tag.slug);
  return { title: page > 1 ? `${tag.name} · Page ${page}` : tag.name, description: d ? `Stories about ${d}.` : `HYFIN stories tagged ${tag.name}.`, alternates: { canonical: pageHref(`/tag/${tag.slug}`, page) } };
}

/** A tag's stories, newest first (design: tag pages are simple lists). */
export default async function TagPage({ params, searchParams }: PageProps<"/tag/[slug]">) {
  const page = parsePage(await searchParams);
  const tag = await tagBySlug((await params).slug);
  if (!tag || page === null) notFound();
  const list = await getPostPage(await getPayload({ config }), { tagSlug: tag.slug, page, perPage: PER_PAGE });
  if (page > Math.max(1, list.totalPages)) notFound();
  const d = definition(tag.slug);
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-[clamp(20px,4vw,60px)] pb-16 pt-9">
      <header className="flex flex-col gap-3 border-b border-white pb-7">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">Tag</span>
        <h1 className="m-0 break-words font-display text-[clamp(40px,6vw,88px)] uppercase leading-[0.95] tracking-[-0.02em]">{tag.name}</h1>
        {d && <p className="m-0 max-w-[680px] text-lg text-ink-soft">{d[0].toUpperCase() + d.slice(1)}.</p>}
      </header>
      <StoryGrid cards={list.cards} page={page} totalPages={list.totalPages} path={`/tag/${tag.slug}`} />
    </div>
  );
}
