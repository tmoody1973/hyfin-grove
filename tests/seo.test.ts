import { describe, expect, it } from "vitest";
import { absoluteUrl, previewUrl, seoDescription, seoTitle, SITE_URL, storyMetadata } from "@/lib/seo";

const post = { title: "SZA’s lyrics validate my experience", slug: "szas-lyrics", category: "music" as const, excerpt: "The five years between SZA’s debut and SOS…", meta: null, heroImage: { url: "https://x.public.blob.vercel-storage.com/sza.webp", width: 1200, height: 675, alt: "SZA" } };

describe("SEO defaults for a post", () => {
  it("titles it '<title> · HYFIN'", () => {
    expect(seoTitle(post)).toBe("SZA’s lyrics validate my experience · HYFIN");
  });
  it("describes it with its summary, trimmed to 160 characters", () => {
    expect(seoDescription(post)).toBe(post.excerpt);
    expect(seoDescription({ ...post, excerpt: "a ".repeat(200) }).length).toBeLessThanOrEqual(160);
  });
  it("gives the full public address", () => {
    expect(absoluteUrl(post)).toBe(`${SITE_URL}/music/szas-lyrics`);
  });
});

describe("Preview button", () => {
  it("opens the post's page on the site", () => {
    expect(previewUrl(post)).toBe(`${SITE_URL}/music/szas-lyrics`);
  });
  it("is empty for a post that can't have a page yet", () => {
    expect(previewUrl({ ...post, slug: "" })).toBeNull();
  });
});

describe("story page metadata", () => {
  it("uses the SEO fields when an editor filled them in", () => {
    const m = storyMetadata({ ...post, meta: { title: "Custom title", description: "Custom description", image: null } });
    expect(m.title).toEqual({ absolute: "Custom title" });
    expect(m.description).toBe("Custom description");
  });
  it("falls back to title, summary and hero image, with a canonical address", () => {
    const m = storyMetadata(post);
    expect(m.title).toBe(post.title);
    expect(m.description).toBe(post.excerpt);
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/music/szas-lyrics`);
    expect(m.openGraph).toMatchObject({ type: "article", url: `${SITE_URL}/music/szas-lyrics`, images: [{ url: post.heroImage.url, width: 1200, height: 675, alt: "SZA" }] });
  });
});
