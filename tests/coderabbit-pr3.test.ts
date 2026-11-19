/** CodeRabbit findings on PR #3 that were judged real. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmbedBlock } from "@/components/story/EmbedBlock";
import { playerHeight } from "@/lib/embeds";
import { loadPostViews } from "@/lib/reviewRules";
import { tagDescription } from "@/lib/taxonomy";
import { selectPosts } from "@/lib/wordpress/bulk";
import { extractEmbeds, MARKER } from "@/lib/wordpress/embedsInHtml";
import { prepareBodyHtml } from "@/lib/wordpress/transform";
import { csvCell, parseCsvRecords } from "@/lib/wordpress/reportCsv";
import type { WpPost } from "@/lib/wordpress/types";

describe("iframe titles", () => {
  it("an empty or blank title falls back to the provider name", () => {
    for (const title of ["", "   "]) {
      expect(renderToStaticMarkup(EmbedBlock({ url: "https://youtu.be/aaaaaaaaaaa", provider: "youtube", title }))).toContain('title="YouTube video"');
    }
  });
});

describe("Bandcamp player height follows its layout", () => {
  const bc = (path: string) => playerHeight({ provider: "bandcamp", url: `https://bandcamp.com/EmbeddedPlayer/${path}`, title: null });
  it("compact, small and full layouts", () => {
    expect(bc("album=1/size=large/tracklist=false/artwork=small/")).toBe(120);
    expect(bc("album=1/size=small/")).toBe(42);
    expect(bc("album=1/size=large/")).toBe(472);
  });
});

describe("analytics slugs", () => {
  it("encoded and decoded paths for the same post are one slug", () => {
    const csv = join(mkdtempSync(join(tmpdir(), "hyfin-enc-")), "v.csv");
    writeFileSync(csv, "Page path and screen class,Views\n/2025/06/11/wu%e2%80%91tang/,10\n/2025/06/11/wu‑tang/,5\n");
    expect(loadPostViews(csv).get("wu‑tang")).toBe(15);
  });
});

describe("SEO", () => {
  it("strips every trailing slash from the site address and never splits an emoji", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com//";
    const { vi } = await import("vitest");
    vi.resetModules();
    const seo = await import("@/lib/seo");
    expect(seo.SITE_URL).toBe("https://example.com");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const d = seo.seoDescription({ excerpt: `${"a".repeat(158)}😀 and more text after it` });
    expect(d.endsWith("…")).toBe(true);
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(d)).toBe(false);
  });
});

describe("tag descriptions", () => {
  it("a tag named like a built-in property gets no description, not a function", () => {
    expect(tagDescription("constructor")).toBe("");
    expect(tagDescription("toString")).toBe("");
  });
});

describe("--limit with excluded posts", () => {
  it("excluded (Ladies First) posts don't use up the limit", () => {
    const lf = { id: 1, slug: "lf", categories: [1169] } as unknown as WpPost;
    const ok = { id: 2, slug: "ok", categories: [12] } as unknown as WpPost;
    expect(selectPosts([lf, ok], new Set(), new Set(), { limit: 1 })).toEqual([ok]);
  });
});

describe("embeds inside wrapper divs", () => {
  it("stay between the paragraphs around them", () => {
    const r = extractEmbeds('<div><p>Before</p><iframe src="https://youtu.be/aaaaaaaaaaa"></iframe><p>After</p></div>');
    expect(r.html).toBe(`<p>Before</p><p>${MARKER}0</p><p>After</p>`);
  });
});

describe("gallery captions", () => {
  it("survive unwrapping", () => {
    const out = prepareBodyHtml('<figure class="wp-block-gallery"><figure class="wp-block-image"><img src="https://hyfin.org/a.jpg"></figure><figcaption>Opening night</figcaption></figure>', new Map([["https://hyfin.org/a.jpg", 3]]));
    expect(out).toContain("Opening night");
    expect(out).not.toContain("wp-block-gallery");
  });
});

describe("import report CSV", () => {
  it("round-trips fields with commas, quotes and newlines", () => {
    const rows = [["1", "a", "failed", csvCell("line one\nline two, \"quoted\"")], ["2", "b", "failed", csvCell("x\ny")]].map((r) => r.join(","));
    const parsed = parseCsvRecords(["wpId,slug,status,error", ...rows].join("\n"));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(["1", "a", "failed", 'line one\nline two, "quoted"']);
    expect(parsed[1][0]).toBe("2");
  });
});
