import type { Category } from "./taxonomy";

/** A post's public address: /<category>/<slug> (design: Old links). */
/** Where an internal rich-text link to another document points. Unloaded docs fall back to "#". */
export function internalLinkHref(doc: { relationTo: string; value: unknown }): string {
  const v = doc.value as { category?: Category; slug?: string } | null;
  if (doc.relationTo === "posts" && v && typeof v === "object" && v.category && v.slug) return postPath({ category: v.category, slug: v.slug });
  return "#";
}

export const postPath = (post: { category: Category; slug: string }): string => `/${post.category}/${encodeURIComponent(post.slug)}`;
