import { permanentRedirect } from "next/navigation";
import { legacyOr404 } from "@/lib/legacy/legacyOr404";
import { parseLegacyPath } from "@/lib/legacy";
import { getPostByLegacySlug, postPath } from "@/lib/posts";

/** Old hyfin.org post links (/2024/04/07/slug/) answer with a permanent redirect to the new story page. */
export default async function LegacyPostRedirect({ params }: PageProps<"/legacy/[year]/[month]/[day]/[slug]">) {
  const p = await params;
  const parsed = parseLegacyPath(p);
  const path = `/${p.year}/${p.month}/${p.day}/${p.slug}`;
  if (!parsed) return legacyOr404(path);
  const post = await getPostByLegacySlug(parsed.wpSlug);
  if (!post) return legacyOr404(path);
  permanentRedirect(postPath(post));
}
