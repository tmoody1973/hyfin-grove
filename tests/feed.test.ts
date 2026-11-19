import { describe, expect, it } from "vitest";
import { renderFeed, rfc822, toFeedItem } from "@/lib/feed";

const SITE = "https://hyfin.example";
const item = (over = {}) => ({ title: "Title", link: `${SITE}/music/x`, pubDate: "2026-11-19T14:00:00.000Z", description: "Dek", creator: "Paula Lovo", ...over });

describe("renderFeed", () => {
  it("is RSS 2.0 with a channel, self link and items", () => {
    const xml = renderFeed([item()], SITE);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<title>HYFIN</title>");
    expect(xml).toContain(`<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>`);
    expect(xml).toContain(`<guid isPermaLink="true">${SITE}/music/x</guid>`);
    expect(xml).toContain("<dc:creator>Paula Lovo</dc:creator>");
  });
  it("escapes &, <, > and quotes in titles and descriptions, and keeps emoji", () => {
    const xml = renderFeed([item({ title: `Tom & Jerry <live> "quoted" 'single' 🎤`, description: "<p>A & B</p>" })], SITE);
    expect(xml).toContain("<title>Tom &amp; Jerry &lt;live&gt; &quot;quoted&quot; &apos;single&apos; 🎤</title>");
    expect(xml).toContain("<description>&lt;p&gt;A &amp; B&lt;/p&gt;</description>");
  });
  it("drops characters XML forbids", () => {
    expect(renderFeed([item({ title: "a\u0000b\u000bc" })], SITE)).toContain("<title>abc</title>");
  });
  it("leaves out empty description and creator", () => {
    const xml = renderFeed([item({ description: null, creator: null })], SITE);
    expect(xml).not.toContain("<description></description>");
    expect(xml).not.toContain("<dc:creator>");
  });
});

describe("rfc822", () => {
  it("formats dates the way RSS readers expect", () => {
    expect(rfc822("2026-11-19T14:00:00.000Z")).toBe("Thu, 19 Nov 2026 14:00:00 GMT");
  });
});

describe("toFeedItem", () => {
  it("links to the absolute /<category>/<slug> address", () => {
    const f = toFeedItem({ title: "T", slug: "a b", category: "culture", publishedAt: "2026-11-19T14:00:00.000Z", excerpt: " ", byline: null }, SITE);
    expect(f.link).toBe(`${SITE}/culture/a%20b`);
    expect(f.description).toBeNull();
  });
});
