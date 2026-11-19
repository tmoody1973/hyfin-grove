import type { ImportResult } from "./importPost";
import { isExcludedFromImport } from "./transform";
import type { WpPost } from "./types";

export const SMALL_TAG = 10;

export type BulkRow = {
  wpId: number;
  slug: string;
  status: "created" | "updated" | "excluded" | "failed";
  category?: string;
  confidence?: number;
  needsReview?: boolean;
  reasons?: string[];
  tags?: string[];
  embeds?: number;
  imagesFailed?: number;
  error?: string;
};

export type BulkSummary = { total: number; created: number; updated: number; excluded: number; failed: number };

/** Reject after `ms` so one hung post (Jev, WordPress, an image) can't stall the whole run. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Import posts a few at a time. Every post produces exactly one row; a failure is recorded, never thrown,
 * so the run always finishes. (ponytail: in-process pool; a queue service only if runs outgrow one machine.)
 */
export async function runBulk(
  items: WpPost[],
  run: (wp: WpPost) => Promise<ImportResult>,
  opts: { concurrency: number; perPostTimeoutMs: number; onResult: (row: BulkRow) => void },
): Promise<BulkSummary> {
  const summary: BulkSummary = { total: items.length, created: 0, updated: 0, excluded: 0, failed: 0 };
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const wp = items[next++];
      let row: BulkRow;
      if (isExcludedFromImport(wp)) {
        row = { wpId: wp.id, slug: wp.slug, status: "excluded" };
      } else {
        try {
          const r = await withTimeout(run(wp), opts.perPostTimeoutMs);
          row = {
            wpId: wp.id, slug: wp.slug, status: r.created ? "created" : "updated",
            category: r.category, confidence: r.categoryConfidence, needsReview: r.needsReview,
            reasons: r.reasons, tags: r.tagSlugs, embeds: r.embeds, imagesFailed: r.images.failed.length,
          };
        } catch (error) {
          row = { wpId: wp.id, slug: wp.slug, status: "failed", error: (error as Error).message };
        }
      }
      summary[row.status]++;
      opts.onResult(row);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));
  return summary;
}

/** Which posts a run touches: new ones by default, everything with refresh, only past failures with retryFailed. */
export function selectPosts(
  all: WpPost[],
  imported: Set<number>,
  failed: Set<number>,
  flags: { refresh?: boolean; retryFailed?: boolean; limit?: number },
): WpPost[] {
  const picked = flags.retryFailed ? all.filter((p) => failed.has(p.id))
    : flags.refresh ? all
    : all.filter((p) => !imported.has(p.id));
  return flags.limit ? picked.slice(0, flags.limit) : picked;
}

/** Counts for the import summary: categories, tags (small ones flagged), review set, failures. */
export function summarize(rows: BulkRow[]) {
  const done = rows.filter((r) => r.status === "created" || r.status === "updated");
  const count = (values: string[]) => values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
  const tags = count(done.flatMap((r) => r.tags ?? []));
  return {
    categories: count(done.map((r) => r.category ?? "unknown")),
    tags,
    smallTags: Object.keys(tags).filter((t) => tags[t] < SMALL_TAG).sort(),
    reviewSet: done.filter((r) => r.needsReview).length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
}
