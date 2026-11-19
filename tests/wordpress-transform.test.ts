import { describe, expect, it } from "vitest";
import fixture from "./fixtures/wp-post-sza.json";
import type { WpPost } from "@/lib/wordpress/types";
import { imageUrlsIn, isExcludedFromImport, prepareBodyHtml, toPostDraft } from "@/lib/wordpress/transform";

const post = fixture[0] as unknown as WpPost;
const IMG = "https://hyfin.org/wp-content/uploads/2024/04/sza-sos-new-album-stream-1200x675-1.webp";
const SLUG = "szas-lyrics-validate-my-experience-as-a-black-woman";

describe("toPostDraft", () => {
  it("decodes HTML entities in the title", () => {
    expect(toPostDraft(post).title).toBe("SZA’s lyrics validate my experience as a Black woman");
    expect(toPostDraft({ ...post, title: { rendered: "Tom &amp; Jerry" } }).title).toBe("Tom & Jerry");
  });

  it("keeps the WordPress identity for redirects", () => {
    const d = toPostDraft(post);
    expect(d.slug).toBe(SLUG);
    expect(d.legacy).toEqual({ wpId: 113835, wpSlug: SLUG, wpDate: "2024-04-07T21:34:27Z", wpUrl: `https://hyfin.org/2024/04/07/${SLUG}/` });
    expect(d.wpCategoryIds).toEqual([12]);
  });

  it("returns the featured image id, or null when there is none", () => {
    expect(toPostDraft(post).heroMediaId).toBe(113837);
    expect(toPostDraft({ ...post, featured_media: 0 }).heroMediaId).toBeNull();
  });

  it("turns the excerpt into plain text", () => {
    const d = toPostDraft({ ...post, excerpt: { rendered: "<p>It&#8217;s <em>here</em> [&hellip;]</p>\n" } });
    expect(d.excerpt).toBe("It’s here […]");
  });
});

describe("isExcludedFromImport", () => {
  it("skips Ladies First (category 1169) and keeps everything else", () => {
    expect(isExcludedFromImport({ ...post, categories: [12, 1169] })).toBe(true);
    expect(isExcludedFromImport(post)).toBe(false);
  });
});

describe("body html", () => {
  it("finds inline images", () => {
    expect(imageUrlsIn(post.content.rendered)).toContain(IMG);
  });

  it("marks uploaded images for Lexical and strips WordPress-only attributes", () => {
    const out = prepareBodyHtml(post.content.rendered, new Map([[IMG, 7]]));
    expect(out).toContain('data-lexical-upload-id="7"');
    expect(out).toContain('data-lexical-upload-relation-to="media"');
    expect(out).not.toContain("srcset");
    expect(out).not.toContain("data-orig-file");
  });

  it("turns iframes into plain links", () => {
    const out = prepareBodyHtml('<p>a</p><iframe src="https://www.youtube.com/embed/x1"></iframe>', new Map());
    expect(out).not.toContain("<iframe");
    expect(out).toContain('<a href="https://www.youtube.com/embed/x1">https://www.youtube.com/embed/x1</a>');
  });
});

describe("numericUploadIds", () => {
  it("turns upload ids read from HTML (strings) into the numbers Postgres-backed Payload expects", async () => {
    const { numericUploadIds } = await import("@/lib/wordpress/transform");
    const state = { root: { type: "root", children: [{ type: "paragraph", children: [] }, { type: "upload", relationTo: "media", value: "7" }] } };
    const out = numericUploadIds(state);
    expect(out.root.children[1]).toMatchObject({ type: "upload", value: 7 });
    expect(state.root.children[1]).toMatchObject({ value: "7" }); // input left untouched
  });
});

describe("hero image in the body", () => {
  it("drops the body's copy of the featured image (and its figure) so it isn't shown twice", () => {
    const out = prepareBodyHtml(post.content.rendered, new Map([[IMG, 7]]), IMG);
    expect(out).not.toContain("data-lexical-upload-id=\"7\"");
    expect(out).not.toContain("<figure");
    expect(out).toContain("<p");
  });

  it("keeps other images", () => {
    const html = '<figure><img src="https://hyfin.org/a.jpg"></figure><p>x</p><figure><img src="https://hyfin.org/b.jpg"></figure>';
    const out = prepareBodyHtml(html, new Map([["https://hyfin.org/b.jpg", 9]]), "https://hyfin.org/a.jpg");
    expect(out).not.toContain("a.jpg");
    expect(out).toContain('data-lexical-upload-id="9"');
  });
});
