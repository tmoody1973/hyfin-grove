/**
 * Fill the byline on imported WordPress posts. The import kept only WordPress's numeric author id, and the
 * WordPress API refuses to name users, so: list every post's author id, read the name once per author from a
 * public post page (<meta name="author">), then write it to archive posts whose byline is still empty.
 *   pnpm tsx --env-file=.env.local scripts/backfill-wp-bylines.ts --dry-run
 */
import config from "@payload-config";
import { getPayload, type Where } from "payload";
import { authorNameFromHtml } from "@/lib/wordpress/authorName";

const BASE = "https://hyfin.org/wp-json/wp/v2/posts";
const dryRun = process.argv.includes("--dry-run");

type Row = { id: number; author: number; link: string };
const rows: Row[] = [];
for (let page = 1, total = 1; page <= total; page++) {
  const res = await fetch(`${BASE}?per_page=100&page=${page}&_fields=id,author,link`);
  if (!res.ok) throw new Error(`WordPress page ${page}: HTTP ${res.status}`);
  total = Number(res.headers.get("x-wp-totalpages") ?? "1");
  rows.push(...((await res.json()) as Row[]));
}

const byAuthor = new Map<number, Row[]>();
for (const r of rows) byAuthor.set(r.author, [...(byAuthor.get(r.author) ?? []), r]);

const names = new Map<number, string>();
for (const [author, posts] of byAuthor) {
  for (const p of posts.slice(0, 3)) { // a page can fail; try up to three of the author's posts
    const res = await fetch(p.link);
    const name = res.ok ? authorNameFromHtml(await res.text()) : null;
    if (name) { names.set(author, name); break; }
  }
  console.log(`author ${author}: ${names.get(author) ?? "(no name found)"} — ${posts.length} posts`);
}

const payload = await getPayload({ config });
let written = 0;
for (const [author, name] of names) {
  const wpIds = byAuthor.get(author)!.map((r) => r.id);
  const where: Where = { and: [{ "legacy.wpId": { in: wpIds } }, { source: { equals: "wordpress" } }, { byline: { exists: false } }] };
  if (dryRun) {
    written += (await payload.count({ collection: "posts", where })).totalDocs;
    continue;
  }
  const { docs, errors } = await payload.update({ collection: "posts", where, data: { byline: name }, depth: 0 });
  written += docs.length;
  if (errors.length) console.error(`${name}: ${errors.length} failed`, errors.slice(0, 3));
}
console.log(`${dryRun ? "would fill" : "filled"} ${written} bylines from ${rows.length} WordPress posts`);
process.exit(0);
