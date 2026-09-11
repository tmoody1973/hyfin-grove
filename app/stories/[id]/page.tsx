import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/AudioPlayer";
import { getStory, metaLine } from "@/lib/cds";

export async function generateMetadata({ params }: PageProps<"/stories/[id]">): Promise<Metadata> {
  const { id } = await params;
  const story = await getStory(id);
  return story ? { title: story.title, description: story.teaser ?? undefined } : {};
}

export default async function StoryPage({ params }: PageProps<"/stories/[id]">) {
  const { id } = await params;
  const story = await getStory(id);
  if (!story) notFound();

  return (
    <article className="py-10">
      <Link href="/" className="text-sm text-ink-soft hover:text-accent">← All episodes</Link>

      <header className="rise mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Ladies First</p>
        <h1 className="font-display mt-2 text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">{story.shortTitle}</h1>
        {story.teaser && <p className="mt-4 text-xl leading-relaxed text-ink-soft">{story.teaser}</p>}
        <p className="mt-4 text-sm text-ink-soft">{metaLine(story)}</p>
      </header>

      {story.imageWide && (
        <figure className="rise mt-8" style={{ animationDelay: "80ms" }}>
          <Image
            src={story.imageWide} alt={story.imageAlt} width={1440} height={810} priority
            sizes="(min-width: 768px) 768px, 100vw" className="aspect-[16/9] w-full object-cover"
          />
        </figure>
      )}

      {story.audioUrl && (
        <div className="rise mt-8" style={{ animationDelay: "140ms" }}>
          <AudioPlayer key={story.id} src={story.audioUrl} title={story.title} durationHint={story.durationSeconds} />
        </div>
      )}

      <div className="rise prose-cds mt-10 text-lg leading-[1.7]" style={{ animationDelay: "200ms" }}>
        {story.body.map((block) =>
          block.kind === "html" ? (
            <div key={block.id} dangerouslySetInnerHTML={{ __html: block.html }} />
          ) : (
            <figure key={block.id} className="my-8">
              <Image src={block.src} alt={block.caption ?? ""} width={block.width} height={block.height} sizes="(min-width: 768px) 768px, 100vw" className="w-full" />
              {(block.caption || block.credit) && (
                <figcaption className="mt-2 text-sm text-ink-soft">
                  {block.caption} {block.credit && <span className="uppercase tracking-wide">{block.credit}</span>}
                </figcaption>
              )}
            </figure>
          ),
        )}
      </div>

      {story.canonicalUrl && (
        <p className="mt-12 border-t border-rule pt-6 text-sm text-ink-soft">
          Originally published at{" "}
          <a href={story.canonicalUrl} className="text-accent underline underline-offset-4" target="_blank" rel="noreferrer">
            radiomilwaukee.org
          </a>
        </p>
      )}
    </article>
  );
}
