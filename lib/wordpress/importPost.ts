import config from "@payload-config";
import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { JSDOM } from "jsdom";
import path from "path";
import type { Payload } from "payload";
import { askJev } from "../sorting/jev";
import { buildSortQuestions, interpretSort, showSlugForWpCategories, sortStateFor } from "../sorting/sortPost";
import { fetchMedia } from "./client";
import { imageUrlsIn, isExcludedFromImport, numericUploadIds, prepareBodyHtml, toPostDraft } from "./transform";
import type { WpPost } from "./types";

export class ExcludedPostError extends Error {}

export type ImportResult = {
  postId: number;
  created: boolean;
  category: string;
  categoryConfidence: number;
  needsReview: boolean;
  images: { uploaded: number; reused: number; failed: string[] };
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
    const res = await fetch(url);
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
export async function importPost(payload: Payload, wp: WpPost, apiKey: string, log: Log = () => {}): Promise<ImportResult> {
  if (isExcludedFromImport(wp)) throw new ExcludedPostError(`post ${wp.id} is excluded (Ladies First)`);
  const draft = toPostDraft(wp);
  const images: ImportResult["images"] = { uploaded: 0, reused: 0, failed: [] };

  const hero = draft.heroMediaId ? await fetchMedia(draft.heroMediaId) : null;
  if (draft.heroMediaId && !hero) log(`warning: featured image ${draft.heroMediaId} not found`);
  const heroId = hero ? await ensureMedia(payload, hero.source_url, hero.alt_text || draft.title, images, log) : null;

  const uploaded = new Map<string, number>();
  for (const url of imageUrlsIn(draft.bodyHtml)) {
    const id = url === hero?.source_url && heroId ? heroId : await ensureMedia(payload, url, "", images, log);
    if (id !== null) uploaded.set(url, id);
  }
  const body = numericUploadIds(convertHTMLToLexical({
    editorConfig: await editorConfigFactory.default({ config: await config }),
    html: prepareBodyHtml(draft.bodyHtml, uploaded),
    JSDOM,
  }));

  const [{ docs: tags }, { docs: shows }] = await Promise.all([
    payload.find({ collection: "tags", limit: 200, depth: 0 }),
    payload.find({ collection: "shows", limit: 200, depth: 0 }),
  ]);
  const sort = interpretSort(
    await askJev(sortStateFor(draft), buildSortQuestions(tags), apiKey),
    tags.map((t) => t.slug),
  );
  const showSlug = showSlugForWpCategories(
    draft.wpCategoryIds,
    shows.map((s) => ({ slug: s.slug, wpCategoryIds: s.wpCategoryIds ?? [] })),
  );

  const data = {
    title: draft.title,
    slug: draft.slug,
    category: sort.category,
    tags: tags.filter((t) => sort.tagSlugs.includes(t.slug)).map((t) => t.id),
    show: shows.find((s) => s.slug === showSlug)?.id ?? null,
    publishedAt: draft.publishedAt,
    excerpt: draft.excerpt,
    heroImage: heroId,
    body,
    source: "wordpress" as const,
    legacy: draft.legacy,
    sorting: { categoryConfidence: sort.categoryConfidence, needsReview: sort.needsReview },
  };

  const { docs: existing } = await payload.find({ collection: "posts", where: { "legacy.wpId": { equals: wp.id } }, limit: 1, depth: 0 });
  const doc = existing[0]
    ? await payload.update({ collection: "posts", id: existing[0].id, data })
    : await payload.create({ collection: "posts", data });

  return { postId: doc.id, created: !existing[0], category: sort.category, categoryConfidence: sort.categoryConfidence, needsReview: sort.needsReview, images };
}
