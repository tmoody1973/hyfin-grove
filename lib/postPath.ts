import type { Category } from "./taxonomy";

/** A post's public address: /<category>/<slug> (design: Old links). */
export const postPath = (post: { category: Category; slug: string }): string => `/${post.category}/${post.slug}`;
