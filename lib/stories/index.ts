import type { Payload, Where } from "payload";
import type { Media, Post, Show, Tag } from "@/payload-types";
import { postPath } from "../postPath";
import { visible } from "../postQueries";
import type { Category } from "../taxonomy";

/** Everything a story card or lead needs, flattened from a post (design: one card for every list). */
export type Card = {
  id: number;
  title: string;
  href: string;
  excerpt: string | null;
  byline: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  imageAlt: string;
  label: string | null;
};

/** Only `find` is used, so tests can pass a fake. */
export type Db = Pick<Payload, "find">;

const text = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
const loaded = <T extends object>(v: number | T | null | undefined): T | null => (v && typeof v === "object" ? v : null);

/** Image rule: uploaded hero image, then the CDS image, else none (the card draws a placeholder). */
export function toCard(post: Post): Card {
  const hero = loaded<Media>(post.heroImage);
  const firstTag = Array.isArray(post.tags) ? loaded<Tag>(post.tags[0]) : null;
  return {
    id: post.id,
    title: post.title,
    href: postPath(post),
    excerpt: text(post.excerpt),
    byline: text(post.byline),
    publishedAt: post.publishedAt || null,
    imageUrl: text(hero?.url) ?? text(post.cds?.imageUrl),
    imageAlt: hero?.alt ?? "",
    label: loaded<Show>(post.show)?.name ?? firstTag?.name ?? null,
  };
}

export type PostFilter = { category?: Category; tagSlug?: string; showId?: number; excludeId?: number };

const filterWhere = ({ category, tagSlug, showId, excludeId }: PostFilter): Where =>
  visible({
    and: [
      ...(category ? [{ category: { equals: category } }] : []),
      ...(tagSlug ? [{ "tags.slug": { equals: tagSlug } }] : []),
      ...(showId ? [{ show: { equals: showId } }] : []),
      ...(excludeId ? [{ id: { not_equals: excludeId } }] : []),
    ],
  });

/** One page of stories, newest first. Depth 1 loads the show, tags and hero image each card needs. */
export async function getPostPage(db: Db, opts: PostFilter & { page: number; perPage: number }) {
  const r = await db.find({ collection: "posts", where: filterWhere(opts), sort: "-publishedAt", page: opts.page, limit: opts.perPage, depth: 1 });
  return { cards: r.docs.map(toCard), page: r.page ?? opts.page, totalPages: r.totalPages };
}

const hasImage: Where = { or: [{ heroImage: { exists: true } }, { "cds.imageUrl": { exists: true } }] };

/** The pinned story if it is still on the site; otherwise the newest story with an image (design: Front page). */
export async function getLead(db: Db, pin: number | Post | null | undefined, category?: Category): Promise<Card | null> {
  const pinId = typeof pin === "number" ? pin : pin?.id;
  if (pinId) {
    const { docs } = await db.find({ collection: "posts", where: visible({ id: { equals: pinId } }), limit: 1, depth: 1 });
    if (docs[0]) return toCard(docs[0]);
  }
  const { docs } = await db.find({
    collection: "posts",
    where: visible({ and: [...(category ? [{ category: { equals: category } }] : []), hasImage] }),
    sort: "-publishedAt",
    limit: 1,
    depth: 1,
  });
  return docs[0] ? toCard(docs[0]) : null;
}

/** A tag by its slug; null for unknown or malformed slugs (→ 404). */
export async function resolveTag(db: Db, slug: string): Promise<Tag | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { docs } = await db.find({ collection: "tags", where: { slug: { equals: slug } }, limit: 1, depth: 0 });
  return docs[0] ?? null;
}

/**
 * New Music Mondays has no WordPress category, tag or CDS series; its posts share a title prefix
 * ("NEW MUSIC MONDAYS…", "NEW MUSIC MONDAYS:", "New Music Monday:").
 */
export const isNmmTitle = (title: string): boolean => /^new music mondays?(?![a-z])/i.test(title.trim());
