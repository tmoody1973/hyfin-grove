import type { Metadata } from "next";
import { postPath } from "./postPath";
import type { Category } from "./taxonomy";

/** Public address of the site. Set NEXT_PUBLIC_SITE_URL for the beta / final domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://hyfin-grove.vercel.app").replace(/\/+$/, "");

type Image = { url?: string | null; width?: number | null; height?: number | null; alt?: string | null };
type SeoPost = {
  title: string;
  slug: string;
  category: Category;
  excerpt?: string | null;
  heroImage?: Image | number | null;
  meta?: { title?: string | null; description?: string | null; image?: Image | number | null } | null;
  cds?: { imageUrl?: string | null } | null;
};

const MAX_DESCRIPTION = 160;
const clip = (s: string) => {
  if (s.length <= MAX_DESCRIPTION) return s;
  let end = MAX_DESCRIPTION - 1;
  // Never cut between the two halves of an emoji (a UTF-16 surrogate pair).
  if (/[\uD800-\uDBFF]/.test(s[end - 1])) end--;
  return `${s.slice(0, end).trimEnd()}…`;
};

export const seoTitle = (p: Pick<SeoPost, "title">) => `${p.title} · HYFIN`;
export const seoDescription = (p: Pick<SeoPost, "excerpt">) => clip((p.excerpt ?? "").trim());
export const absoluteUrl = (p: Pick<SeoPost, "category" | "slug">) => `${SITE_URL}${postPath(p)}`;

/** Where the admin's Preview button goes; null until the post has a slug and category. */
export const previewUrl = (p: Partial<Pick<SeoPost, "category" | "slug">>) =>
  p.slug && p.category ? absoluteUrl({ category: p.category, slug: p.slug }) : null;

const asImage = (i: Image | number | null | undefined): Image | null => (i && typeof i === "object" && i.url ? i : null);

/** Story page <head>: editor-written SEO fields win, otherwise title, summary and hero image. */
export function storyMetadata(p: SeoPost): Metadata {
  const url = absoluteUrl(p);
  const description = p.meta?.description || seoDescription(p) || undefined;
  const image = asImage(p.meta?.image) ?? asImage(p.heroImage) ?? asImage(p.cds?.imageUrl ? { url: p.cds.imageUrl } : null);
  return {
    // The layout's template adds " · HYFIN"; an editor's own SEO title is used exactly as written.
    title: p.meta?.title ? { absolute: p.meta.title } : p.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: p.meta?.title || p.title,
      description,
      images: image ? [{ url: image.url!, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt ?? undefined }] : undefined,
    },
  };
}

/** The search index lists every post's title: editors only until public search is built deliberately. */
export const searchIndexAccess = {
  read: ({ req }: { req: { user?: unknown } }) => Boolean(req.user),
};
