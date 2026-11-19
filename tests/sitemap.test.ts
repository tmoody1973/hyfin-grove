import { describe, expect, it } from "vitest";
import { sitemapEntries } from "@/lib/sitemap";

const SITE = "https://hyfin.example";
const data = {
  posts: [
    { category: "music" as const, slug: "a b", updatedAt: "2026-11-01T00:00:00.000Z" },
    { category: "culture" as const, slug: "c", updatedAt: "2026-10-01T00:00:00.000Z" },
  ],
  tags: [{ slug: "interviews" }],
  shows: [{ slug: "ladies-first" }],
  hosts: [{ slug: "paula-lovo" }],
  pages: [{ slug: "thewiz", updatedAt: "2026-01-01T00:00:00.000Z" }],
};

describe("sitemapEntries", () => {
  const urls = sitemapEntries(data, SITE).map((e) => e.url);
  it("lists the fixed pages, sections and every kind of page", () => {
    for (const u of ["/", "/music", "/culture", "/milwaukee", "/events", "/listen/playlist", "/listen/schedule", "/shows", "/music/a%20b", "/culture/c", "/tag/interviews", "/shows/ladies-first", "/hosts/paula-lovo", "/thewiz"]) {
      expect(urls).toContain(`${SITE}${u === "/" ? "" : u}`);
    }
  });
  it("never lists NPR pages, admin or API", () => {
    expect(urls.some((u) => /\/npr\/|\/admin|\/api\//.test(u))).toBe(false);
  });
  it("dates stories by their last change", () => {
    expect(sitemapEntries(data, SITE).find((e) => e.url.endsWith("/culture/c"))?.lastModified).toBe("2026-10-01T00:00:00.000Z");
  });
});
