/**
 * Import WordPress posts into Payload. Loads .env.local.
 *   pnpm import:wp --slug <slug> [--slug <slug> ...]   one or more posts
 *   pnpm import:wp --all [--limit N]                   every post not yet imported
 *   pnpm import:wp --all --refresh                     re-import everything (reviewed posts keep their category/tags)
 *   pnpm import:wp --all --retry-failed                only posts that failed in the last report
 *   --concurrency N (default 2)
 * Writes docs/migration/import-report.csv and docs/migration/import-summary.md.
 */
import config from "@payload-config";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { getPayload } from "payload";
import { runBulk, selectPosts, summarize, type BulkRow } from "../lib/wordpress/bulk";
import { csvCell, parseCsvRecords } from "../lib/wordpress/reportCsv";
import { fetchAllPosts, fetchPostBySlug } from "../lib/wordpress/client";
import { buildImportContext, importPost } from "../lib/wordpress/importPost";
import type { WpPost } from "../lib/wordpress/types";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const slugs = args.flatMap((a, i) => (a === "--slug" && args[i + 1] ? [args[i + 1]] : []));
const apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set (add it to .env.local; run via pnpm import:wp)");
if (!slugs.length && !flag("all")) throw new Error("Pass --slug <slug> or --all");

const REPORT = "docs/migration/import-report.csv";
const COLUMNS: Array<keyof BulkRow> = ["wpId", "slug", "status", "category", "confidence", "needsReview", "reasons", "tags", "embeds", "imagesFailed", "error"];

/** Previous report rows by WordPress ID, so partial runs update the report instead of replacing it. */
function readReport(): Map<number, string[]> {
  if (!existsSync(REPORT)) return new Map();
  return new Map(parseCsvRecords(readFileSync(REPORT, "utf8")).map((r) => [Number(r[0]), r]));
}

const payload = await getPayload({ config });
const ctx = await buildImportContext(payload, apiKey);

let candidates: WpPost[] = [];
let missing = 0;
if (slugs.length) {
  for (const slug of slugs) {
    const wp = await fetchPostBySlug(slug);
    if (wp) candidates.push(wp);
    else {
      missing++;
      process.stderr.write(`${slug}: not found on hyfin.org\n`);
    }
  }
} else {
  for await (const wp of fetchAllPosts()) candidates.push(wp);
  const { docs } = await payload.find({ collection: "posts", where: { source: { equals: "wordpress" } }, limit: 5000, depth: 0, select: { legacy: true } });
  const imported = new Set(docs.map((d) => d.legacy?.wpId).filter((n): n is number => typeof n === "number"));
  const previous = readReport();
  const failed = new Set([...previous].filter(([, row]) => row[2] === "failed").map(([id]) => id));
  candidates = selectPosts(candidates, imported, failed, { refresh: flag("refresh"), retryFailed: flag("retry-failed"), limit: Number(value("limit")) || undefined });
}

const rows: BulkRow[] = [];
let done = 0;
const started = Date.now();
const summary = await runBulk(candidates, (wp) => importPost(payload, wp, ctx, (m) => process.stderr.write(`  ${wp.slug}: ${m}\n`)), {
  concurrency: Number(value("concurrency")) || 2,
  perPostTimeoutMs: 180_000,
  onResult: (row) => {
    rows.push(row);
    done++;
    const detail = row.status === "failed" ? `FAILED ${row.error}` : row.status === "excluded" ? "excluded (Ladies First)"
      : `${row.category} (confidence ${row.confidence?.toFixed(2)}${row.needsReview ? `, review: ${row.reasons?.join("+") || "kept"}` : ""}) · embeds ${row.embeds} · images failed ${row.imagesFailed}`;
    process.stdout.write(`[${done}/${candidates.length}] ${row.slug}: ${row.status} · ${detail}\n`);
  },
});

mkdirSync("docs/migration", { recursive: true });
const merged = readReport();
for (const r of rows) merged.set(r.wpId, COLUMNS.map((c) => String(r[c] ?? "")));
writeFileSync(REPORT, [COLUMNS.join(","), ...[...merged.values()].map((row) => row.map(csvCell).join(","))].join("\n") + "\n");
const s = summarize(rows);
writeFileSync("docs/migration/import-summary.md", `# WordPress import summary

Run ${new Date().toISOString()} · ${candidates.length} posts in ${Math.round((Date.now() - started) / 1000)}s
Created ${summary.created} · updated ${summary.updated} · excluded ${summary.excluded} · failed ${summary.failed}
Review set in this run: ${s.reviewSet}

## Categories
${Object.entries(s.categories).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## Tags (under 10 posts are merge candidates for Tarik)
${Object.entries(s.tags).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}${v < 10 ? "  ← under 10" : ""}`).join("\n")}

## Failures
${rows.filter((r) => r.status === "failed").map((r) => `- ${r.slug} (${r.wpId}): ${r.error}`).join("\n") || "None"}
`);
process.stdout.write(`done: ${JSON.stringify(summary)}\n`);
process.exit(summary.failed || missing ? 1 : 0);
