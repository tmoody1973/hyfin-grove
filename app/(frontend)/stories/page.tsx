import type { Metadata } from "next";
import config from "@payload-config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { getPostPage } from "@/lib/stories";
import { pageHref, parsePage } from "@/lib/stories/params";

const PER_PAGE = 24;
const CHIP = "inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em]";

export async function generateMetadata({ searchParams }: PageProps<"/stories">): Promise<Metadata> {
  const page = parsePage(await searchParams) ?? 1;
  return { title: page > 1 ? `Stories · Page ${page}` : "Stories", description: "Every HYFIN story, newest first: music, culture and Milwaukee.", alternates: { canonical: pageHref("/stories", page) } };
}

/** Every story, newest first: the phone's Stories tab (plan 15, task 5). Sections link to their own pages. */
export default async function StoriesPage({ searchParams }: PageProps<"/stories">) {
  const page = parsePage(await searchParams);
  if (page === null) notFound();
  const list = await getPostPage(await getPayload({ config }), { page, perPage: PER_PAGE });
  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pb-16 pt-10">
      <h1 className="sg-fx sg-lines m-0 font-display text-[clamp(44px,8vw,92px)] uppercase leading-[0.92] tracking-[-0.02em]">Stories</h1>
      <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-0">
        <span aria-current="page" className={`${CHIP} bg-white text-black`}>All</span>
        {[["Music", "/music"], ["Culture", "/culture"], ["Milwaukee", "/milwaukee"]].map(([label, href]) => (
          <Link key={href} href={href} className={`${CHIP} -ml-px hover:text-[#00ff9f]`}>{label}</Link>
        ))}
      </nav>
      <div className="mt-10">
        <StoryGrid cards={list.cards} page={page} totalPages={list.totalPages} path="/stories" />
      </div>
    </div>
  );
}
