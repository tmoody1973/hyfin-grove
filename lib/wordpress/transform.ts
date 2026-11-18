import { JSDOM } from "jsdom";
import type { PostDraft, WpPost } from "./types";

/** WordPress category IDs never imported. 1169 = Ladies First: CDS owns that show (decision 002). */
export const EXCLUDED_WP_CATEGORY_IDS: readonly number[] = [1169];

const textOf = (html: string) => JSDOM.fragment(`<div>${html}</div>`).textContent?.replace(/\s+/g, " ").trim() ?? "";

export function toPostDraft(wp: WpPost): PostDraft {
  return {
    title: textOf(wp.title.rendered),
    slug: wp.slug,
    publishedAt: wp.date,
    excerpt: textOf(wp.excerpt.rendered),
    legacy: { wpId: wp.id, wpSlug: wp.slug, wpDate: wp.date, wpUrl: wp.link },
    heroMediaId: wp.featured_media > 0 ? wp.featured_media : null,
    wpCategoryIds: wp.categories,
    bodyHtml: wp.content.rendered,
  };
}

export const isExcludedFromImport = (wp: WpPost): boolean =>
  wp.categories.some((id) => EXCLUDED_WP_CATEGORY_IDS.includes(id));

/** WordPress serves resized copies (…-1170x658.webp) in src; the full original is in data-orig-file. */
const originalSrc = (img: Element): string | null => img.getAttribute("data-orig-file") || img.getAttribute("src");

/** Original-size image URLs in post HTML, deduped. The featured image usually appears here too. */
export function imageUrlsIn(html: string): string[] {
  const doc = new JSDOM(html).window.document;
  return [...new Set([...doc.querySelectorAll("img")].map(originalSrc).filter((s): s is string => !!s))];
}

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
    if (id !== undefined) {
      img.setAttribute("data-lexical-upload-id", String(id));
      img.setAttribute("data-lexical-upload-relation-to", "media");
    }
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
