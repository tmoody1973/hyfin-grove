import { JSDOM } from "jsdom";
import { normalizeSlug } from "../legacy";
import type { PostDraft, WpPost } from "./types";

/** WordPress category IDs never imported. 1169 = Ladies First: CDS owns that show (decision 002). */
export const EXCLUDED_WP_CATEGORY_IDS: readonly number[] = [1169];

const textOf = (html: string) => JSDOM.fragment(`<div>${html}</div>`).textContent?.replace(/\s+/g, " ").trim() ?? "";

export function toPostDraft(wp: WpPost): PostDraft {
  const slug = normalizeSlug(wp.slug) ?? wp.slug;
  if (!wp.date_gmt) throw new Error(`post ${wp.id} has no UTC publish date (date_gmt)`);
  const publishedAt = `${wp.date_gmt}Z`; // date_gmt is UTC; `date` is Milwaukee time with no zone.
  return {
    title: textOf(wp.title.rendered),
    slug,
    publishedAt,
    excerpt: textOf(wp.excerpt.rendered),
    legacy: { wpId: wp.id, wpSlug: slug, wpDate: publishedAt, wpUrl: wp.link },
    heroMediaId: wp.featured_media > 0 ? wp.featured_media : null,
    wpCategoryIds: wp.categories,
    bodyHtml: wp.content.rendered,
  };
}

export const isExcludedFromImport = (wp: WpPost): boolean =>
  wp.categories.some((id) => EXCLUDED_WP_CATEGORY_IDS.includes(id));

/** WordPress serves resized copies (…-1170x658.webp) in src; the full original is in data-orig-file. */
const originalSrc = (img: Element): string | null => img.getAttribute("data-orig-file") || img.getAttribute("src");

/** Original-size images in post HTML with their alt text, deduped by URL. */
export function imagesIn(html: string): { url: string; alt: string }[] {
  const doc = new JSDOM(html).window.document;
  const byUrl = new Map<string, string>();
  for (const img of doc.querySelectorAll("img")) {
    const url = originalSrc(img);
    if (url && !byUrl.has(url)) byUrl.set(url, img.getAttribute("alt") ?? "");
  }
  return [...byUrl].map(([url, alt]) => ({ url, alt }));
}

/** Original-size image URLs in post HTML, deduped. The featured image usually appears here too. */
export const imageUrlsIn = (html: string): string[] => imagesIn(html).map((i) => i.url);

/**
 * Get WordPress HTML ready for Payload's convertHTMLToLexical: drop the body copy of the hero image, point
 * uploaded images at their Media documents, drop WordPress-only attributes, and (slice fallback, ponytail) turn iframes into plain links
 * until the census decides real embed handling.
 */
export function prepareBodyHtml(html: string, uploaded: Map<string, string | number>, heroUrl?: string | null): string {
  const doc = new JSDOM(html).window.document;
  for (const img of doc.querySelectorAll("img")) {
    const original = originalSrc(img);
    // WordPress repeats the featured image in the body; the story page already shows it as the hero.
    if (heroUrl && original === heroUrl) {
      (img.closest("figure") ?? img).remove();
      continue;
    }
    if (original) img.setAttribute("src", original);
    for (const attr of [...img.attributes]) {
      if (attr.name === "srcset" || attr.name === "sizes" || attr.name.startsWith("data-")) img.removeAttribute(attr.name);
    }
    const id = uploaded.get(img.getAttribute("src") ?? "");
    if (id === undefined) {
      // No Media doc (download failed or image is gone from hyfin.org): drop it rather than break the body.
      (img.closest("figure") ?? img).remove();
      continue;
    }
    img.setAttribute("data-lexical-upload-id", String(id));
    img.setAttribute("data-lexical-upload-relation-to", "media");
  }
  for (const frame of doc.querySelectorAll("iframe")) {
    const src = frame.getAttribute("src") ?? "";
    const p = doc.createElement("p");
    const a = doc.createElement("a");
    a.href = src;
    a.textContent = src;
    p.appendChild(a);
    frame.replaceWith(p);
  }
  return doc.body.innerHTML;
}

type LexicalNode = { type?: string; value?: unknown; children?: LexicalNode[]; [key: string]: unknown };

/**
 * convertHTMLToLexical reads upload ids from HTML attributes, so they arrive as strings; Payload on Postgres
 * validates them as numbers. Returns a new state with numeric upload ids; the input is not modified.
 */
export function numericUploadIds<T extends { root: LexicalNode }>(state: T): T {
  const fix = (node: LexicalNode): LexicalNode => ({
    ...node,
    ...(node.type === "upload" && typeof node.value === "string" && /^\d+$/.test(node.value) ? { value: Number(node.value) } : {}),
    ...(node.children ? { children: node.children.map(fix) } : {}),
  });
  return { ...state, root: fix(state.root) } as T;
}
