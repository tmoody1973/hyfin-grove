import { describe, expect, it } from "vitest";
import { cdsOwnedFields, planSync, slugFor, type StoredCds } from "@/lib/cds/plan";
import type { CdsPostData } from "@/lib/cds/toPost";

const remote = (cdsId: string, editorialLastModified = "2026-10-30T10:00:00Z", extra: Partial<CdsPostData> = {}): CdsPostData => ({
  cdsId, title: `Story ${cdsId}`, excerpt: null, publishedAt: "2026-10-30T09:00:00Z", byline: null, audio: null, imageUrl: null, imageCaption: null, imageCredit: null, imageAlt: null,
  canonicalUrl: `https://radiomilwaukee.org/show/ladies-first/2026-10-30/${cdsId}-slug`, editorialLastModified,
  cdsBody: [], collectionIds: [], premium: false, ...extra,
});
const stored = (cdsId: string, postId: number, editorialLastModified: string | null = "2026-10-30T10:00:00Z", withdrawnAt: string | null = null, byline: string | null = null): StoredCds =>
  ({ postId, cdsId, editorialLastModified, withdrawnAt, byline });

describe("planSync", () => {
  it("rewrites a story whose author name changed, even with no newer CDS edit (a fixed biography)", () => {
    const named = remote("a", "2026-10-30T10:00:00Z", { byline: "Paula Lovo" });
    expect(planSync([named], [stored("a", 1)], new Set()).update.map((u) => u.postId)).toEqual([1]);
    expect(planSync([named], [stored("a", 1, undefined, null, "Paula Lovo")], new Set()).update).toEqual([]);
  });
  it("creates stories it has never seen", () => {
    expect(planSync([remote("a")], [], new Set()).create.map((p) => p.cdsId)).toEqual(["a"]);
  });
  it("updates only when Brightspot edited the story since the last sync", () => {
    const plan = planSync([remote("a", "2026-10-31T00:00:00Z"), remote("b")], [stored("a", 1), stored("b", 2)], new Set());
    expect(plan.update.map((u) => u.postId)).toEqual([1]);
    expect(plan.create).toEqual([]);
  });
  it("withdraws a stored story CDS no longer returns at all", () => {
    expect(planSync([remote("a")], [stored("a", 1), stored("gone", 2)], new Set()).withdraw).toEqual([2]);
  });
  it("keeps a story that merely left the HYFIN collections but still exists", () => {
    expect(planSync([remote("a")], [stored("a", 1), stored("untagged", 2)], new Set(["untagged"])).withdraw).toEqual([]);
  });
  it("does not withdraw twice", () => {
    expect(planSync([remote("a")], [stored("a", 1), stored("gone", 2, null, "2026-11-01T00:00:00Z")], new Set()).withdraw).toEqual([]);
  });
  it("restores a withdrawn story that came back", () => {
    const plan = planSync([remote("a")], [stored("a", 1, "2026-10-30T10:00:00Z", "2026-11-01T00:00:00Z")], new Set());
    expect(plan.restore.map((r) => r.postId)).toEqual([1]);
    expect(plan.update).toEqual([]);
  });
  it("refuses to read an empty CDS answer as 'everything was withdrawn'", () => {
    expect(() => planSync([], [stored("a", 1)], new Set())).toThrow("CDS returned no stories");
  });
});

describe("cdsOwnedFields", () => {
  it("never touches the editor's category, tags or show", () => {
    const fields = cdsOwnedFields(remote("a"), new Date("2026-11-19T00:00:00Z")) as Record<string, unknown>;
    for (const key of ["category", "tags", "show", "sorting", "slug"]) expect(fields).not.toHaveProperty(key);
    expect(fields.title).toBe("Story a");
    expect((fields.cds as Record<string, unknown>).documentId).toBe("a");
  });
});

describe("slugFor", () => {
  it("reuses the slug Radio Milwaukee chose for the story's own page", () => {
    expect(slugFor(remote("g-s921-17816", undefined, { canonicalUrl: "https://radiomilwaukee.org/show/ladies-first/2026-10-30/qing-madi-songs-2026" }))).toBe("qing-madi-songs-2026");
  });
  it("falls back to the title when there is no page", () => {
    expect(slugFor(remote("x", undefined, { canonicalUrl: null, title: "Ladies First: Qing Madi!" }))).toBe("ladies-first-qing-madi");
  });
});
