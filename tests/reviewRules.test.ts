import { describe, expect, it } from "vitest";
import { loadPostViews, reviewReasons, stampReview, topSlugs, RECENT_SINCE } from "@/lib/reviewRules";

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
  it("sums views per WordPress slug", () => {
    expect(loadPostViews().get("szas-lyrics-validate-my-experience-as-a-black-woman")).toBe(31389);
  });
  it("merges path variants (case, trailing slash) into one slug", () => {
    const views = loadPostViews("tests/fixtures/views-variants.csv");
    expect(views.get("a-post")).toBe(15);
  });
  it("picks the top 100 posts", () => {
    const top = topSlugs(loadPostViews());
    expect(top.size).toBe(100);
    expect(top.has("szas-lyrics-validate-my-experience-as-a-black-woman")).toBe(true);
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
