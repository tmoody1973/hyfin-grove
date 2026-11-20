import config from "@payload-config";
import { getPayload } from "payload";
import { renderFeed, toFeedItem } from "@/lib/feed";
import { visible } from "@/lib/postQueries";
import { SITE_URL } from "@/lib/seo";

/** The 30 newest stories as RSS. Old hyfin.org /feed/ links are redirected here in plan 7. */
export async function GET() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "posts",
    where: visible({ source: { not_equals: "npr" } }), // NPR copies credit npr.org; not HYFIN's to syndicate
    sort: "-publishedAt",
    limit: 30,
    depth: 0,
    select: { title: true, slug: true, category: true, publishedAt: true, excerpt: true, byline: true },
  });
  return new Response(renderFeed(docs.map((p) => toFeedItem(p, SITE_URL)), SITE_URL), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900" },
  });
}
