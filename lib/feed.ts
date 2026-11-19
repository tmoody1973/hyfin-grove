import type { Post } from "@/payload-types";
import { postPath } from "./postPath";

export type FeedItem = { title: string; link: string; pubDate: string; description: string | null; creator: string | null };

// Characters XML 1.0 forbids (most C0 controls); a stray one makes the whole feed unreadable.
const FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;
const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const esc = (s: string) => s.replace(FORBIDDEN, "").replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** "Thu, 19 Nov 2026 14:00:00 GMT" (RFC 822, what RSS pubDate wants). */
export const rfc822 = (iso: string) => new Date(iso).toUTCString();

const text = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export const toFeedItem = (p: Pick<Post, "title" | "slug" | "category" | "publishedAt" | "excerpt" | "byline">, site: string): FeedItem => ({
  title: p.title,
  link: `${site}${postPath(p)}`,
  pubDate: p.publishedAt,
  description: text(p.excerpt),
  creator: text(p.byline),
});

/** RSS 2.0 for the newest stories (replaces hyfin.org's /feed/). */
export function renderFeed(items: FeedItem[], site: string): string {
  const entries = items.map((i) =>
    [
      "<item>",
      `<title>${esc(i.title)}</title>`,
      `<link>${esc(i.link)}</link>`,
      `<guid isPermaLink="true">${esc(i.link)}</guid>`,
      `<pubDate>${rfc822(i.pubDate)}</pubDate>`,
      i.description ? `<description>${esc(i.description)}</description>` : "",
      i.creator ? `<dc:creator>${esc(i.creator)}</dc:creator>` : "",
      "</item>",
    ].join(""),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "<channel>",
    "<title>HYFIN</title>",
    `<link>${esc(site)}/</link>`,
    "<description>Black music and culture from Radio Milwaukee.</description>",
    "<language>en-us</language>",
    `<atom:link href="${esc(site)}/feed.xml" rel="self" type="application/rss+xml"/>`,
    ...entries,
    "</channel>",
    "</rss>",
  ].join("\n");
}
