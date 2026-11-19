import Link from "next/link";
import { postPath, type StoryLink } from "@/lib/posts";

const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" });

/** A plain list of stories (title, date, teaser) for show and host pages. */
export function StoryList({ stories }: { stories: StoryLink[] }) {
  return (
    <ul>
      {stories.map((s) => (
        <li key={s.id} className="border-b border-white/25 py-5">
          <Link href={postPath(s)} className="group block">
            <span className="font-mono text-xs text-ink-soft">{s.publishedAt ? date.format(new Date(s.publishedAt)) : ""}</span>
            <span className="mt-1 block break-words text-xl font-semibold group-hover:text-[#00ff9f]">{s.title}</span>
            {s.excerpt && <span className="mt-1 block text-ink-soft">{s.excerpt}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
