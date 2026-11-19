import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import type { DefaultNodeTypes, SerializedBlockNode, SerializedLinkNode } from "@payloadcms/richtext-lexical";
import { type JSXConvertersFunction, LinkJSXConverter, RichText } from "@payloadcms/richtext-lexical/react";
import { PlayButton } from "@/components/player/PlayButton";
import { AudioBlock } from "@/components/story/AudioBlock";
import { EmbedBlock } from "@/components/story/EmbedBlock";
import type { EmbedProvider } from "@/lib/embeds";
import { getPostBySlug, postPath } from "@/lib/posts";
import { internalLinkHref } from "@/lib/postPath";
import { routeSlug } from "@/lib/legacy";
import { CATEGORY_LABELS, isCategory } from "@/lib/taxonomy";
import type { Media } from "@/payload-types";

type EmbedFields = { url: string; provider?: EmbedProvider | null; title?: string | null };
type AudioFields = { url: string; title?: string | null };
type NodeTypes = DefaultNodeTypes | SerializedBlockNode<EmbedFields> | SerializedBlockNode<AudioFields>;

/**
 * How story text is drawn: links to other stories point at their address (Payload's default renders "#"),
 * and Embed/Audio blocks become allowlisted players.
 */
const convertersFor = (href: string): JSXConvertersFunction<NodeTypes> => ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({
    internalDocToHref: ({ linkNode }: { linkNode: SerializedLinkNode }) =>
      linkNode.fields.doc ? internalLinkHref(linkNode.fields.doc) : "#",
  }),
  blocks: {
    embed: ({ node }: { node: SerializedBlockNode<EmbedFields> }) => <EmbedBlock {...node.fields} />,
    audio: ({ node }: { node: SerializedBlockNode<AudioFields> }) => <AudioBlock url={node.fields.url} title={node.fields.title} href={href} />,
  },
});

export async function generateMetadata({ params }: PageProps<"/[category]/[slug]">): Promise<Metadata> {
  const slug = routeSlug((await params).slug);
  const post = slug ? await getPostBySlug(slug) : null;
  return post ? { title: post.title, description: post.excerpt ?? undefined } : {};
}

const dateLine = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });

/** Story page, from docs/mockups-html/screens/05-stories/article-with-audio-player.html (Figma wins). */
export default async function StoryPage({ params }: PageProps<"/[category]/[slug]">) {
  const { category, slug: rawSlug } = await params;
  const slug = routeSlug(rawSlug);
  if (!isCategory(category) || !slug) notFound();
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  if (post.category !== category) permanentRedirect(postPath(post));

  const hero = typeof post.heroImage === "object" ? (post.heroImage as Media | null) : null;
  const href = postPath(post);

  return (
    <article>
      <section className="px-[clamp(20px,4vw,60px)] pt-11">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-[22px]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="bg-[#0070ff] px-2 py-[3px] font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-black">
              {CATEGORY_LABELS[post.category]}
            </span>
            <span className="font-mono text-xs text-ink-soft">
              {dateLine(post.publishedAt)}
              {post.byline ? ` · By ${post.byline}` : ""}
            </span>
          </div>
          <h1 className="max-w-[1100px] font-display text-[clamp(40px,6.2vw,92px)] leading-[0.95] tracking-[-0.02em] uppercase [text-wrap:balance]">
            {post.title}
          </h1>
          {post.excerpt && <p className="max-w-[760px] text-[clamp(19px,1.6vw,23px)] leading-[1.4] text-[#e6e6e6] [text-wrap:pretty]">{post.excerpt}</p>}
          {post.audio?.url && <div><PlayButton url={post.audio.url} title={post.title} href={href} /></div>}
        </div>
      </section>

      {hero?.url && (
        <figure className="mx-auto mt-10 max-w-[1320px] px-[clamp(20px,4vw,60px)]">
          <Image src={hero.url} alt={hero.alt ?? ""} width={hero.width ?? 1440} height={hero.height ?? 810} priority sizes="(min-width: 1440px) 1320px, 100vw" className="w-full border border-white" />
          {(hero.caption || hero.credit) && (
            <figcaption className="mt-2 font-mono text-xs text-ink-soft">{[hero.caption, hero.credit].filter(Boolean).join(" · ")}</figcaption>
          )}
        </figure>
      )}

      <section className="px-[clamp(20px,4vw,60px)] pt-10">
        <div className="mx-auto max-w-[1320px]">
          {post.body && <RichText data={post.body} converters={convertersFor(href)} className="story-body max-w-[720px] text-[19px] leading-[1.6]" />}
        </div>
      </section>
    </article>
  );
}
