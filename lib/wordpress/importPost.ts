import config from "@payload-config";
import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { JSDOM } from "jsdom";
import path from "path";
import type { Payload } from "payload";
import { askJev } from "../sorting/jev";
import { buildSortQuestions, interpretSort, showSlugForWpCategories, sortStateFor } from "../sorting/sortPost";
import { fetchMedia } from "./client";
import { loadPostViews, RECENT_SINCE, reviewReasons, topSlugs } from "../reviewRules";
import { extractEmbeds, insertEmbedBlocks } from "./embedsInHtml";
import { heroUrlToStrip, reviewedFieldsToKeep } from "./importPost.pure";
import { imagesIn, isExcludedFromImport, numericUploadIds, prepareBodyHtml, toPostDraft } from "./transform";
import type { WpPost } from "./types";

export class ExcludedPostError extends Error {}

const IMAGE_TIMEOUT_MS = 60_000;

/** Everything a run needs that doesn't change per post: built once, shared by every import. */
export type ImportContext = {
  apiKey: string;
  tags: Array<{ id: number; slug: string; name: string }>;
  shows: Array<{ id: number; slug: string; wpCategoryIds?: number[] | null }>;
  editorConfig: Awaited<ReturnType<typeof editorConfigFactory.default>>;
  review: { top: Set<string>; recentSince: string };
};

export async function buildImportContext(payload: Payload, apiKey: string): Promise<ImportContext> {
  const [{ docs: tags }, { docs: shows }, editorConfig] = await Promise.all([
    payload.find({ collection: "tags", limit: 500, depth: 0 }),
    payload.find({ collection: "shows", limit: 500, depth: 0 }),
    editorConfigFactory.default({ config: await config }),
  ]);
  return { apiKey, tags, shows, editorConfig, review: { top: topSlugs(loadPostViews()), recentSince: RECENT_SINCE } };
}

export type ImportResult = {
  postId: number;
  created: boolean;
  category: string;
  categoryConfidence: number;
  needsReview: boolean;
  images: { uploaded: number; reused: number; failed: string[] };
  embeds: number;
  tagSlugs: string[];
  reasons: string[];
};

type Log = (message: string) => void;

/** Find a Media doc by its original hyfin.org URL, or download and upload it. Null when the download fails. */
async function ensureMedia(
  payload: Payload,
  url: string,
  alt: string,
  stats: ImportResult["images"],
  log: Log,
): Promise<number | null> {
  const { docs } = await payload.find({ collection: "media", where: { sourceUrl: { equals: url } }, limit: 1, depth: 0 });
  if (docs[0]) {
    stats.reused++;
    return docs[0].id;
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());
    const doc = await payload.create({
      collection: "media",
      data: { alt, sourceUrl: url },
      file: { data, mimetype: res.headers.get("content-type") ?? "application/octet-stream", name: path.basename(new URL(url).pathname), size: data.length },
    });
    stats.uploaded++;
    return doc.id;
  } catch (error) {
    stats.failed.push(url);
    log(`warning: image skipped (${(error as Error).message}): ${url}`);
    return null;
  }
}

/** Import one WordPress post into Payload: images to Blob, body to Lexical, Jev sorts it, upsert by WordPress ID. */
export async function importPost(payload: Payload, wp: WpPost, ctx: ImportContext, log: Log = () => {}): Promise<ImportResult> {
  if (isExcludedFromImport(wp)) throw new ExcludedPostError(`post ${wp.id} is excluded (Ladies First)`);
  const draft = toPostDraft(wp);
  const images: ImportResult["images"] = { uploaded: 0, reused: 0, failed: [] };

  // A featured image we can't read (missing, unpublished, timed out) means no hero, not a failed post.
  const hero = draft.heroMediaId ? await fetchMedia(draft.heroMediaId).catch(() => null) : null;
  if (draft.heroMediaId && !hero) log(`warning: featured image ${draft.heroMediaId} unavailable; importing without a hero`);
  const heroId = hero ? await ensureMedia(payload, hero.source_url, hero.alt_text || draft.title, images, log) : null;

  // Embeds come out first: rich-text conversion can't represent them; they return as blocks below.
  const extracted = extractEmbeds(draft.bodyHtml);
  const uploaded = new Map<string, number>();
  for (const { url, alt } of imagesIn(extracted.html)) {
    const id = url === hero?.source_url && heroId ? heroId : await ensureMedia(payload, url, alt, images, log);
    if (id !== null) uploaded.set(url, id);
  }
  const body = insertEmbedBlocks(numericUploadIds(convertHTMLToLexical({
    editorConfig: ctx.editorConfig,
    html: prepareBodyHtml(extracted.html, uploaded, heroUrlToStrip(hero?.source_url, heroId)),
    JSDOM,
  })), extracted.embeds);

  const { docs: existing } = await payload.find({ collection: "posts", where: { "legacy.wpId": { equals: wp.id } }, limit: 1, depth: 0 });
  // A post Tarik already reviewed keeps his category, tags, show and sorting; Jev is not asked again.
  const kept = reviewedFieldsToKeep(existing[0] ?? null);

  let sorted: Pick<ImportResult, "category" | "categoryConfidence" | "needsReview"> & { tags: number[]; show: number | null; sorting: object; reasons: string[] };
  if (kept) {
    sorted = {
      category: kept.category,
      categoryConfidence: Number(existing[0].sorting?.categoryConfidence ?? 1),
      needsReview: false,
      tags: (kept.tags as number[] | null) ?? [],
      show: (kept.show as number | null) ?? null,
      sorting: kept.sorting,
      reasons: [],
    };
  } else {
    const { tags, shows } = ctx;
    const sort = interpretSort(
      await askJev(sortStateFor(draft), buildSortQuestions(tags), ctx.apiKey),
      tags.map((t) => t.slug),
    );
    const showSlug = showSlugForWpCategories(
      draft.wpCategoryIds,
      shows.map((s) => ({ slug: s.slug, wpCategoryIds: s.wpCategoryIds ?? [] })),
    );
    const reasons = reviewReasons(
      { categoryConfidence: sort.categoryConfidence, wpSlug: draft.legacy.wpSlug, publishedAt: draft.publishedAt },
      ctx.review,
    );
    sorted = {
      category: sort.category,
      categoryConfidence: sort.categoryConfidence,
      needsReview: reasons.length > 0,
      tags: tags.filter((t) => sort.tagSlugs.includes(t.slug)).map((t) => t.id),
      show: shows.find((s) => s.slug === showSlug)?.id ?? null,
      sorting: { categoryConfidence: sort.categoryConfidence, needsReview: reasons.length > 0, reasons },
      reasons,
    };
  }

  const data = {
    title: draft.title,
    slug: draft.slug,
    category: sorted.category as "music" | "culture" | "milwaukee",
    tags: sorted.tags,
    show: sorted.show,
    publishedAt: draft.publishedAt,
    excerpt: draft.excerpt,
    heroImage: heroId,
    body,
    source: "wordpress" as const,
    legacy: draft.legacy,
    sorting: sorted.sorting,
  };

  // A review saved while Jev was answering wins: re-read just before writing and keep reviewed fields.
  // ponytail: re-read narrows the race to milliseconds; a DB-level conditional update would close it.
  if (existing[0] && !kept) {
    const fresh = await payload.findByID({ collection: "posts", id: existing[0].id, depth: 0 });
    const nowKept = reviewedFieldsToKeep(fresh);
    if (nowKept) Object.assign(data, { category: nowKept.category, tags: nowKept.tags, show: nowKept.show, sorting: nowKept.sorting });
  }
  const doc = existing[0]
    ? await payload.update({ collection: "posts", id: existing[0].id, data })
    : await payload.create({ collection: "posts", data });

  return { postId: doc.id, created: !existing[0], category: sorted.category, categoryConfidence: sorted.categoryConfidence, needsReview: sorted.needsReview, images, embeds: extracted.embeds.length,
    tagSlugs: ctx.tags.filter((t) => (data.tags as number[]).includes(t.id)).map((t) => t.slug), reasons: sorted.reasons };
}
