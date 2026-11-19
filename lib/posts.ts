import "server-only";
import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";
import type { Post } from "@/payload-types";
import { bylineWhere, visible } from "./postQueries";

export { postPath } from "./postPath";

const payload = () => getPayload({ config });

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const { docs } = await (await payload()).find({ collection: "posts", where: visible({ slug: { equals: slug } }), limit: 1, depth: 1 });
  return docs[0] ?? null;
});

/** Find an imported post by its old WordPress slug (old hyfin.org links). */
export const getPostByLegacySlug = cache(async (wpSlug: string): Promise<Post | null> => {
  const { docs } = await (await payload()).find({
    collection: "posts",
    where: visible({ "legacy.wpSlug": { equals: wpSlug } }),
    limit: 1,
    depth: 0,
  });
  return docs[0] ?? null;
});

/** A synced story by its CDS id (old /stories/<id> links). */
export const getPostByCdsId = cache(async (cdsId: string): Promise<Post | null> => {
  const { docs } = await (await payload()).find({
    collection: "posts",
    where: visible({ "cds.documentId": { equals: cdsId } }),
    limit: 1,
    depth: 0,
  });
  return docs[0] ?? null;
});

export type StoryLink = Pick<Post, "id" | "title" | "slug" | "category" | "publishedAt" | "excerpt">;
const STORY_FIELDS = { title: true, slug: true, category: true, publishedAt: true, excerpt: true } as const;

/** A show's stories, newest first: Ladies First CDS stories and WordPress archive episodes together. */
export const getPostsByShow = cache(async (showId: number, limit: number): Promise<StoryLink[]> => {
  const { docs } = await (await payload()).find({ collection: "posts", where: visible({ show: { equals: showId } }), sort: "-publishedAt", limit, depth: 0, select: STORY_FIELDS });
  return docs as StoryLink[];
});

/** Stories whose byline names this person ("Kenny Perez, Paula Lovo" counts for both). */
export const getPostsByByline = cache(async (name: string, limit: number): Promise<StoryLink[]> => {
  const { docs } = await (await payload()).find({ collection: "posts", where: bylineWhere(name), sort: "-publishedAt", limit, depth: 0, select: STORY_FIELDS });
  return docs as StoryLink[];
});
