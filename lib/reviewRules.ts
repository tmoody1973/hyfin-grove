import { existsSync, readFileSync } from "node:fs";
import { normalizeSlug } from "./legacy";
import { CATEGORY_REVIEW_THRESHOLD } from "./sorting/sortPost";

/** The 18-month line for "recent" posts Tarik reviews (design: Review). */
export const RECENT_SINCE = "2025-05-18";
export const TOP_TRAFFIC = 100;
export const DEFAULT_VIEWS_CSV = "docs/Pages_and_screens_Page_path_and_screen_class.csv";

export type ReviewReason = "low-confidence" | "top-traffic" | "recent";

/** Why a post goes to Tarik's review queue. Empty means Jev's call stands. */
export function reviewReasons(
  p: { categoryConfidence: number; wpSlug: string; publishedAt: string },
  ctx: { top: Set<string>; recentSince: string },
): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (p.categoryConfidence < CATEGORY_REVIEW_THRESHOLD) reasons.push("low-confidence");
  if (ctx.top.has(p.wpSlug.toLowerCase())) reasons.push("top-traffic");
  if (p.publishedAt.slice(0, 10) >= ctx.recentSince) reasons.push("recent");
  return reasons;
}

/** First two CSV columns of a line (path, views), honouring double-quoted fields. */
function pathAndViews(line: string): [string, number] | null {
  const m = /^("(?:[^"]|"")*"|[^,]*),("?)(\d+)\2(,|$)/.exec(line);
  if (!m) return null;
  const path = m[1].startsWith('"') ? m[1].slice(1, -1).replace(/""/g, '"') : m[1];
  return [path, Number(m[3])];
}

/** Views per WordPress post slug (lowercase), summed across path variants, from the GA export. */
export function loadPostViews(csvPath: string = DEFAULT_VIEWS_CSV): Map<string, number> {
  const views = new Map<string, number>();
  // ponytail: the GA export is local data (not in git); without it nothing counts as top traffic.
  if (!existsSync(csvPath)) {
    process.stderr.write(`warning: ${csvPath} not found; no posts will be flagged top-traffic\n`);
    return views;
  }
  for (const line of readFileSync(csvPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const row = pathAndViews(line);
    const raw = row && /^\/\d{4}\/\d{2}\/\d{2}\/([^/?#]+)\/?$/.exec(row[0])?.[1];
    // Same slug rules as the importer, so encoded and decoded paths for one post add up.
    const slug = raw ? normalizeSlug(raw) : null;
    if (row && slug) views.set(slug, (views.get(slug) ?? 0) + row[1]);
  }
  return views;
}

export function topSlugs(views: Map<string, number>, n: number = TOP_TRAFFIC): Set<string> {
  return new Set([...views].sort((a, b) => b[1] - a[1]).slice(0, n).map(([slug]) => slug));
}

type Sorting = { reviewed?: boolean | null; reviewedAt?: string | null; needsReview?: boolean | null; [k: string]: unknown };

/**
 * When an editor ticks "Reviewed", record when and take the post off the queue. Imports (no editor) never stamp.
 * Returns new data; the input is not modified.
 */
export function stampReview<T extends { sorting?: Sorting | null }>(
  data: T,
  original: { sorting?: Sorting | null } | null | undefined,
  byEditor: boolean,
  now: string,
): T {
  const turnedOn = data.sorting?.reviewed === true && original?.sorting?.reviewed !== true;
  if (!byEditor || !turnedOn) return data;
  return { ...data, sorting: { ...data.sorting, reviewedAt: now, needsReview: false } };
}
