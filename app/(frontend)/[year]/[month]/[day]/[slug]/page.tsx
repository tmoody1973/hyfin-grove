import { notFound, permanentRedirect } from "next/navigation";
import { parseLegacyPath } from "@/lib/legacy";
import { getPostByLegacySlug, postPath } from "@/lib/posts";

/** Old hyfin.org post links (/2024/04/07/slug/) answer with a permanent redirect to the new story page. */
export default async function LegacyPostRedirect({ params }: PageProps<"/[year]/[month]/[day]/[slug]">) {
  const parsed = parseLegacyPath(await params);
  if (!parsed) notFound();
  const post = await getPostByLegacySlug(parsed.wpSlug);
  if (!post) notFound();
  permanentRedirect(postPath(post));
}
