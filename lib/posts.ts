import "server-only";
import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";
import type { Post } from "@/payload-types";
import { visible } from "./postQueries";

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
