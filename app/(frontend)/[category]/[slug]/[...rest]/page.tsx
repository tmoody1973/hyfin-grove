import { legacyOr404 } from "@/lib/legacy/legacyOr404";

/** Addresses three or more segments deep exist only on the old hyfin.org: resolve them or 404. */
export default async function DeepLegacy({ params }: PageProps<"/[category]/[slug]/[...rest]">) {
  const { category, slug, rest } = await params;
  return legacyOr404(`/${[category, slug, ...rest].join("/")}`);
}
