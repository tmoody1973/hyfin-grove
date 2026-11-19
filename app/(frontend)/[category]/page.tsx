import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import config from "@payload-config";
import { getPayload } from "payload";
import { LeadStory } from "@/components/stories/LeadStory";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { type Db, getLead, getPostPage } from "@/lib/stories";
import { pageHref, parsePage } from "@/lib/stories/params";
import { visible } from "@/lib/postQueries";
import { type Category, CATEGORY_LABELS, isCategory } from "@/lib/taxonomy";

const PER_PAGE = 24;

const DESCRIPTIONS: Record<Category, string> = {
  music: "New music, interviews and the artists HYFIN plays.",
  culture: "Black culture: arts, entertainment, food, history and the people making it.",
  milwaukee: "Milwaukee stories from HYFIN and Radio Milwaukee.",
};

const LEAD_PIN = { music: "musicLead", culture: "cultureLead", milwaukee: "milwaukeeLead" } as const;

export async function generateMetadata({ params, searchParams }: PageProps<"/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return {};
  const page = parsePage(await searchParams) ?? 1;
  const path = pageHref(`/${category}`, page);
  return { title: page > 1 ? `${CATEGORY_LABELS[category]} · Page ${page}` : CATEGORY_LABELS[category], description: DESCRIPTIONS[category], alternates: { canonical: path } };
}

/** Shows with stories in this section, most stories first (Music's "Series" row). */
async function seriesFor(db: Db & Pick<Awaited<ReturnType<typeof getPayload>>, "count">, category: Category) {
  const { docs: shows } = await db.find({ collection: "shows", depth: 0, limit: 100, pagination: false, select: { name: true, slug: true } });
  const counted = await Promise.all(
    shows.map(async (s) => ({ ...s, stories: (await db.count({ collection: "posts", where: visible({ and: [{ show: { equals: s.id } }, { category: { equals: category } }] }) })).totalDocs })),
  );
  return counted.filter((s) => s.stories > 0).sort((a, b) => b.stories - a.stories);
}

function SectionHeading({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-t border-white pt-[22px]">
      <span className="font-mono text-[13px] text-ink-soft">{n}</span>
      <h2 className="m-0 font-display text-[clamp(30px,3.6vw,52px)] uppercase leading-none">{children}</h2>
    </div>
  );
}

const TAB = "inline-flex min-h-11 items-center border border-white px-4 [&+&]:border-l-0";

/** Music, Culture and Milwaukee (mockup screens/04-music/music-page.html; Culture and Milwaukee drop the Music-only rows). */
export default async function SectionPage({ params, searchParams }: PageProps<"/[category]">) {
  const { category } = await params;
  const page = parsePage(await searchParams);
  if (!isCategory(category) || page === null) notFound();

  const db = await getPayload({ config });
  const front = await db.findGlobal({ slug: "front-page", depth: 0 });
  const lead = await getLead(db, front[LEAD_PIN[category]], category);
  const [list, series] = await Promise.all([
    getPostPage(db, { category, excludeIds: [lead?.id], page, perPage: PER_PAGE }),
    category === "music" && page === 1 ? seriesFor(db, category) : Promise.resolve([]),
  ]);
  if (page > Math.max(1, list.totalPages)) notFound();
  const label = CATEGORY_LABELS[category];
  const path = `/${category}`;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-[clamp(20px,4vw,60px)] pb-16">
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pb-7 pt-9">
        <h1 className="m-0 font-display text-[clamp(48px,7vw,104px)] uppercase leading-[0.95] tracking-[-0.02em]">{label}</h1>
        {category === "music" && (
          <nav aria-label="Music sections" className="flex flex-wrap font-mono text-xs uppercase tracking-[0.06em]">
            <a href="#stories" className={`${TAB} bg-white font-semibold text-black`}>
              Stories
            </a>
            <Link href="/shows" className={TAB}>
              Shows
            </Link>
            <Link href="/milwaukee" className={TAB}>
              Milwaukee
            </Link>
          </nav>
        )}
      </section>

      {lead && page === 1 && (
        <section aria-label="Lead story" className="border-t border-white pb-12 pt-6">
          <LeadStory card={lead} />
        </section>
      )}

      <section id="stories" aria-label={`Latest in ${label}`} className="flex flex-col gap-6 pb-14">
        <SectionHeading n="01">Latest in {label}</SectionHeading>
        <StoryGrid cards={list.cards} page={page} totalPages={list.totalPages} path={path} />
      </section>

      {series.length > 0 && (
        <section aria-label="Series" className="flex flex-col gap-6 pb-14">
          <SectionHeading n="02">Series</SectionHeading>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
            {series.map((s) => (
              <Link key={s.id} href={`/shows/${s.slug}`} className="flex min-h-[140px] flex-col gap-2.5 border border-white p-[18px] hover:bg-white hover:text-black">
                <span className="font-display text-2xl uppercase leading-[1.05]">{s.name}</span>
                <span className="mt-auto font-mono text-xs opacity-70">
                  {s.stories} {s.stories === 1 ? "story" : "stories"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {category === "music" && page === 1 && (
        <section aria-label="Shows and DJs" className="flex flex-col gap-6">
          <SectionHeading n="03">Shows and DJs</SectionHeading>
          <div className="flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.08em]">
            <Link href="/shows" className="inline-flex min-h-11 items-center border border-white px-[18px]">
              All shows
            </Link>
            <Link href="/listen/schedule" className="inline-flex min-h-11 items-center border border-white px-[18px]">
              The schedule and DJs
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
