import type { MetadataRoute } from "next";
import { postPath } from "./postPath";
import type { Category } from "./taxonomy";

type Data = {
  posts: Array<{ category: Category; slug: string; updatedAt: string }>;
  tags: Array<{ slug: string }>;
  shows: Array<{ slug: string }>;
  hosts: Array<{ slug: string }>;
  pages?: Array<{ slug: string; updatedAt: string }>;
};

const FIXED = ["/", "/music", "/culture", "/milwaukee", "/events", "/listen/playlist", "/listen/schedule", "/shows"];

/** Every public page we own. NPR stories (/npr/) are left out: their canonical home is npr.org (decision 010). */
export function sitemapEntries(d: Data, site: string): MetadataRoute.Sitemap {
  const at = (path: string) => `${site}${path === "/" ? "" : path}`;
  return [
    ...FIXED.map((p) => ({ url: at(p) })),
    ...d.posts.map((p) => ({ url: at(postPath(p)), lastModified: p.updatedAt })),
    ...d.tags.map((t) => ({ url: at(`/tag/${t.slug}`) })),
    ...d.shows.map((s) => ({ url: at(`/shows/${s.slug}`) })),
    ...d.hosts.map((h) => ({ url: at(`/hosts/${h.slug}`) })),
    ...(d.pages ?? []).map((p) => ({ url: at(`/${p.slug}`), lastModified: p.updatedAt })),
  ];
}
