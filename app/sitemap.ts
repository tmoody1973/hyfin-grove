import type { MetadataRoute } from "next";
import config from "@payload-config";
import { getPayload } from "payload";
import { visible } from "@/lib/postQueries";
import { SITE_URL } from "@/lib/seo";
import { sitemapEntries } from "@/lib/sitemap";

// Read per request so new stories appear without a deploy (otherwise Next builds it once at deploy time).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getPayload({ config });
  const all = { pagination: false as const, depth: 0 };
  const [posts, tags, shows, hosts] = await Promise.all([
    db.find({ collection: "posts", where: visible({}), ...all, select: { category: true, slug: true, updatedAt: true } }),
    db.find({ collection: "tags", ...all, select: { slug: true } }),
    db.find({ collection: "shows", ...all, select: { slug: true } }),
    db.find({ collection: "hosts", ...all, select: { slug: true } }),
  ]);
  return sitemapEntries({ posts: posts.docs, tags: tags.docs, shows: shows.docs, hosts: hosts.docs }, SITE_URL);
}
