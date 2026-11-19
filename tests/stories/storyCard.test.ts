import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StoryCard } from "@/components/stories/StoryCard";
import { LeadStory } from "@/components/stories/LeadStory";
import type { Card } from "@/lib/stories";

const card = (over: Partial<Card> = {}): Card => ({
  id: 1,
  title: "Title",
  href: "/music/title",
  excerpt: null,
  byline: null,
  publishedAt: null,
  imageUrl: null,
  imageAlt: "",
  label: null,
  ...over,
});

describe("StoryCard", () => {
  it("draws a same-size placeholder when there is no image", () => {
    const withImage = renderToStaticMarkup(StoryCard({ card: card({ imageUrl: "https://npr.brightspotcdn.com/a.jpg" }), size: "md" }));
    const without = renderToStaticMarkup(StoryCard({ card: card(), size: "md" }));
    const box = (html: string) => /data-media-box="([^"]+)"/.exec(html)?.[1];
    expect(box(without)).toBeDefined();
    expect(box(without)).toBe(box(withImage));
    expect(without).not.toContain("<img");
  });
  it("keeps the full 200-character title", () => {
    const long = "x".repeat(200);
    expect(renderToStaticMarkup(StoryCard({ card: card({ title: long }), size: "sm" }))).toContain(long);
  });
  it("leaves out the byline and date line when both are missing", () => {
    const html = renderToStaticMarkup(StoryCard({ card: card(), size: "md" }));
    expect(html).not.toContain("·");
    expect(html).not.toContain("data-meta");
  });
  it("shows byline and date together when present, and the label", () => {
    const html = renderToStaticMarkup(StoryCard({ card: card({ byline: "Paula Lovo", publishedAt: "2026-11-19T14:00:00.000Z", label: "La Alternativa" }), size: "md" }));
    expect(html).toContain("Paula Lovo · Nov 19, 2026");
    expect(html).toContain("La Alternativa");
  });
});

describe("LeadStory", () => {
  it("renders the excerpt when present and a placeholder without an image", () => {
    const html = renderToStaticMarkup(LeadStory({ card: card({ excerpt: "Dek" }) }));
    expect(html).toContain("Dek");
    expect(html).toContain('href="/music/title"');
    expect(html).not.toContain("<img");
  });
  it("sets long titles (New Music Mondays artist lists) smaller so they fit beside the picture", () => {
    const short = renderToStaticMarkup(LeadStory({ card: card({ title: "Short" }) }));
    const long = renderToStaticMarkup(LeadStory({ card: card({ title: "x".repeat(120) }) }));
    expect(/data-title-size="(\w+)"/.exec(short)?.[1]).toBe("big");
    expect(/data-title-size="(\w+)"/.exec(long)?.[1]).toBe("long");
  });
});
