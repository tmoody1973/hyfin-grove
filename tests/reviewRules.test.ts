import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_VIEWS_CSV, loadPostViews, reviewReasons, stampReview, topSlugs, RECENT_SINCE } from "@/lib/reviewRules";

const ctx = { top: new Set(["sza"]), recentSince: "2025-05-18" };

describe("reviewReasons", () => {
  it("flags nothing for a confident, older, low-traffic post", () => {
    expect(reviewReasons({ categoryConfidence: 0.9, wpSlug: "x", publishedAt: "2024-01-01T00:00:00Z" }, ctx)).toEqual([]);
  });
  it("lists every reason that applies", () => {
    expect(reviewReasons({ categoryConfidence: 0.5, wpSlug: "sza", publishedAt: "2025-06-01T00:00:00Z" }, ctx)).toEqual(["low-confidence", "top-traffic", "recent"]);
  });
  it("treats the 18-month line as inclusive and 0.7 as confident", () => {
    expect(reviewReasons({ categoryConfidence: 0.7, wpSlug: "x", publishedAt: "2025-05-18T00:00:00Z" }, ctx)).toEqual(["recent"]);
  });
  it("uses 2025-05-18 as the 18-month line", () => {
    expect(RECENT_SINCE).toBe("2025-05-18");
  });
});

describe("traffic from the analytics CSV", () => {
  // A generated export: 150 dated posts with descending views, plus a non-post page.
  const csv = join(mkdtempSync(join(tmpdir(), "hyfin-views-")), "views.csv");
  writeFileSync(csv, ["# GA export", "Page path and screen class,Views,Active users", "/about/,99999,1",
    ...Array.from({ length: 150 }, (_, i) => `/2024/01/02/post-${i}/,${10_000 - i},1`)].join("\n"));

  it("sums views per WordPress slug and ignores non-post pages", () => {
    const views = loadPostViews(csv);
    expect(views.get("post-0")).toBe(10_000);
    expect(views.has("about")).toBe(false);
  });
  it("merges path variants (case, trailing slash) into one slug", () => {
    expect(loadPostViews("tests/fixtures/views-variants.csv").get("a-post")).toBe(15);
  });
  it("picks the top 100 posts", () => {
    const top = topSlugs(loadPostViews(csv));
    expect(top.size).toBe(100);
    expect(top.has("post-0")).toBe(true);
    expect(top.has("post-120")).toBe(false);
  });
  // Tarik's real GA export stays local (not in git); this check runs only where it exists.
  it.skipIf(!existsSync(DEFAULT_VIEWS_CSV))("reads the real export: SZA has 31,389 views", () => {
    expect(loadPostViews().get("szas-lyrics-validate-my-experience-as-a-black-woman")).toBe(31389);
  });
});

describe("ticking Reviewed in the admin", () => {
  const now = "2026-11-20T15:00:00.000Z";
  it("stamps reviewedAt and clears needsReview when an editor ticks it", () => {
    const out = stampReview({ sorting: { reviewed: true, needsReview: true } }, { sorting: { reviewed: false } }, true, now);
    expect(out.sorting).toMatchObject({ reviewed: true, needsReview: false, reviewedAt: now });
  });
  it("leaves the stamp alone when nothing changed or no editor is saving", () => {
    const already = { sorting: { reviewed: true, reviewedAt: "2026-11-19T00:00:00.000Z" } };
    expect(stampReview(already, already, true, now).sorting?.reviewedAt).toBe("2026-11-19T00:00:00.000Z");
    expect(stampReview<{ sorting: { reviewed: boolean; reviewedAt?: string } }>({ sorting: { reviewed: true } }, { sorting: { reviewed: false } }, false, now).sorting?.reviewedAt).toBeUndefined();
  });
});
