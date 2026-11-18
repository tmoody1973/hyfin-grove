/**
 * Count every kind of content in hyfin.org's posts so the import knows what to convert.
 * Usage: pnpm tsx scripts/wp-census.ts > docs/wp-census.md
 */
import { JSDOM } from "jsdom";
import { fetchAllPosts } from "../lib/wordpress/client";
import { isExcludedFromImport } from "../lib/wordpress/transform";

const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const elements = new Map<string, number>(); // posts containing each element
const blocks = new Map<string, number>();
const shortcodes = new Map<string, number>();
const iframeHosts = new Map<string, number>();
const scriptHosts = new Map<string, number>();
let total = 0, excluded = 0, noHero = 0, withMp3 = 0;
const byYear = new Map<string, number>();

for await (const post of fetchAllPosts()) {
  total++;
  if (isExcludedFromImport(post)) { excluded++; continue; }
  count(byYear, post.date.slice(0, 4));
  if (!post.featured_media) noHero++;
  const html = post.content.rendered;
  if (/\.mp3\b/i.test(html)) withMp3++;
  const doc = new JSDOM(html).window.document;
  new Set([...doc.querySelectorAll("*")].map((e) => e.tagName.toLowerCase())).forEach((t) => count(elements, t));
  new Set([...html.matchAll(/\bwp-block-([a-z0-9-]+)/g)].map((m) => m[1])).forEach((b) => count(blocks, b));
  new Set([...html.matchAll(/\[([a-z_][a-z0-9_-]*)[\s\]]/g)].map((m) => m[1])).forEach((s) => count(shortcodes, s));
  new Set([...doc.querySelectorAll("iframe")].map((f) => hostOf(f.getAttribute("src")))).forEach((h) => count(iframeHosts, h));
  new Set([...doc.querySelectorAll("script[src]")].map((e) => hostOf(e.getAttribute("src")))).forEach((h) => count(scriptHosts, h));
}

function hostOf(src: string | null): string {
  try { return new URL(src ?? "", "https://hyfin.org").hostname; } catch { return "(bad url)"; }
}

const table = (title: string, m: Map<string, number>, limit = 40) => {
  const rows = [...m].sort((a, b) => b[1] - a[1]).slice(0, limit);
  return `### ${title}\n\n| Value | Posts |\n|---|---|\n${rows.map(([k, v]) => `| \`${k}\` | ${v} |`).join("\n") || "| (none) | 0 |"}\n`;
};

process.stdout.write(`# hyfin.org WordPress content census

Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/wp-census.ts\` from the public REST API.
Counts are posts containing each thing at least once, over posts that will be imported.

| | Count |
|---|---|
| Posts on hyfin.org | ${total} |
| Excluded (Ladies First, category 1169) | ${excluded} |
| To import | ${total - excluded} |
| No featured image | ${noHero} |
| Mention an .mp3 | ${withMp3} |

${table("Posts by year", new Map([...byYear].sort()), 20)}
${table("HTML elements", elements)}
${table("Gutenberg block classes (wp-block-*)", blocks)}
${table("Shortcode-like [tags] (most are bracketed editorial notes like [laughs], not shortcodes)", shortcodes, 25)}
${table("iframe hosts", iframeHosts)}
${table("Script hosts", scriptHosts)}
`);
