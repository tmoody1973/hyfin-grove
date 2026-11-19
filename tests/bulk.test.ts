import { describe, expect, it } from "vitest";
import { runBulk, selectPosts, summarize, type BulkRow } from "@/lib/wordpress/bulk";
import type { WpPost } from "@/lib/wordpress/types";

const wp = (id: number, categories: number[] = [12]) => ({ id, slug: `p${id}`, categories }) as unknown as WpPost;
const [a, b, c, d] = [wp(1), wp(2), wp(3), wp(4)];
const ok = async (p: WpPost) => ({ postId: p.id, created: true, category: "music", categoryConfidence: 0.9, needsReview: false, images: { uploaded: 0, reused: 0, failed: [] as string[] }, embeds: 0, tagSlugs: [] as string[], reasons: [] as string[] });

describe("runBulk", () => {
  it("records a hung post and a failing post and finishes the rest (Review Focus 4)", async () => {
    const rows: BulkRow[] = [];
    const summary = await runBulk(
      [a, b, c, d],
      async (p) => (p === b ? new Promise<never>(() => {}) : p === c ? Promise.reject(new Error("Jev 500")) : ok(p)),
      { concurrency: 2, perPostTimeoutMs: 50, onResult: (r) => rows.push(r) },
    );
    expect(summary).toMatchObject({ total: 4, created: 2, failed: 2 });
    expect(rows.find((r) => r.wpId === b.id)?.error).toMatch(/timed out after 50ms/);
    expect(rows.find((r) => r.wpId === c.id)?.error).toBe("Jev 500");
    expect(rows.map((r) => r.wpId).sort()).toEqual([1, 2, 3, 4]);
  });

  it("never runs more than `concurrency` posts at once", async () => {
    let running = 0, peak = 0;
    await runBulk([a, b, c, d], async (p) => { running++; peak = Math.max(peak, running); await new Promise((r) => setTimeout(r, 5)); running--; return ok(p); }, { concurrency: 2, perPostTimeoutMs: 1000, onResult: () => {} });
    expect(peak).toBe(2);
  });

  it("marks Ladies First posts as excluded rather than failed", async () => {
    const rows: BulkRow[] = [];
    const lf = wp(9, [1169]);
    const summary = await runBulk([lf], ok, { concurrency: 1, perPostTimeoutMs: 1000, onResult: (r) => rows.push(r) });
    expect(rows[0].status).toBe("excluded");
    expect(summary.failed).toBe(0);
  });
});

describe("selectPosts", () => {
  it("skips already-imported posts unless refreshing", () => {
    expect(selectPosts([a, b, c], new Set([1]), new Set(), {})).toEqual([b, c]);
    expect(selectPosts([a, b, c], new Set([1]), new Set(), { refresh: true })).toEqual([a, b, c]);
  });
  it("retries only the failures when asked", () => {
    expect(selectPosts([a, b, c], new Set([1]), new Set([2]), { retryFailed: true })).toEqual([b]);
  });
  it("honours a limit", () => {
    expect(selectPosts([a, b, c, d], new Set(), new Set(), { limit: 2 })).toEqual([a, b]);
  });
});

describe("summarize", () => {
  it("counts categories, tags (flagging tags under 10), and the review set", () => {
    const rows: BulkRow[] = [
      { wpId: 1, slug: "a", status: "created", category: "music", tags: ["arts"], needsReview: true },
      { wpId: 2, slug: "b", status: "updated", category: "culture", tags: ["arts", "food"], needsReview: false },
      { wpId: 3, slug: "c", status: "failed", error: "x" },
    ];
    const s = summarize(rows);
    expect(s.categories).toEqual({ music: 1, culture: 1 });
    expect(s.tags).toEqual({ arts: 2, food: 1 });
    expect(s.smallTags).toEqual(["arts", "food"]);
    expect(s.reviewSet).toBe(1);
    expect(s.failed).toBe(1);
  });
});
