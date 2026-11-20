/**
 * Import hyfin.org's content pages into Pages at their old addresses (plan 7, task 5; list approved by Tarik
 * 2026-11-19). Upserts by WordPress id; images go to Blob like posts.
 *   pnpm tsx --env-file=.env.local scripts/import-wp-pages.ts [--dry-run]
 */
import config from "@payload-config";
import { editorConfigFactory } from "@payloadcms/richtext-lexical";
import { getPayload } from "payload";
import { fetchMedia } from "@/lib/wordpress/client";
import { ensureMedia, wpHtmlToBody } from "@/lib/wordpress/importPost";

const SLUGS = ["thewiz", "harlem", "blackity-black-holiday-market", "aboutus", "mkemade", "hyfin-100", "ecommerce", "friendsgiving", "juneteenth-launch-landing-page"];
const dryRun = process.argv.includes("--dry-run");
type WpPage = { id: number; slug: string; link: string; title: { rendered: string }; content: { rendered: string }; featured_media: number };
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");

async function wpPage(slug: string): Promise<WpPage | null> {
  const res = await fetch(`https://hyfin.org/wp-json/wp/v2/pages?slug=${slug}&_fields=id,slug,link,title,content,featured_media`, { signal: AbortSignal.timeout(120_000), headers: { "User-Agent": "hyfin-migration" } });
  if (!res.ok) throw new Error(`WordPress ${res.status} for ${slug}`);
  return ((await res.json()) as WpPage[])[0] ?? null;
}

async function main() {
  const payload = await getPayload({ config });
  const editorConfig = await editorConfigFactory.default({ config: await config });
  for (const slug of SLUGS) {
    const wp = await wpPage(slug);
    if (!wp) { console.log(`  ${slug}: not on hyfin.org, skipped`); continue; }
    const title = decode(wp.title.rendered);
    const words = (wp.content.rendered.replace(/<[^>]+>/g, " ").match(/[A-Za-z]{3,}/g) ?? []).length;
    if (dryRun) { console.log(`  ${slug}: "${title}" ${words} words, hero ${wp.featured_media || "none"}`); continue; }
    const images = { uploaded: 0, reused: 0, failed: [] as string[] };
    const log = (m: string) => console.log(`    ${m}`);
    const hero = wp.featured_media ? await fetchMedia(wp.featured_media).catch(() => null) : null;
    const heroId = hero ? await ensureMedia(payload, hero.source_url, hero.alt_text || title, images, log) : null;
    const { body, embeds } = await wpHtmlToBody(payload, { editorConfig }, wp.content.rendered, hero?.source_url ?? null, heroId, images, log);
    const data = { title, slug, heroImage: heroId, body, legacy: { wpId: wp.id, wpUrl: wp.link } };
    const { docs } = await payload.find({ collection: "pages", where: { "legacy.wpId": { equals: wp.id } }, limit: 1, depth: 0 });
    if (docs[0]) await payload.update({ collection: "pages", id: docs[0].id, data, depth: 0 });
    else await payload.create({ collection: "pages", data, depth: 0 });
    console.log(`  ${slug}: ${docs[0] ? "updated" : "created"} · ${words} words · images +${images.uploaded} reused ${images.reused} failed ${images.failed.length} · embeds ${embeds}`);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
