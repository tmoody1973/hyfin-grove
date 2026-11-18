/** The fields we read from hyfin.org's public WordPress REST API. */
export type WpPost = {
  id: number;
  date: string;
  /** Publish time in UTC, without a zone suffix. `date` is the site's local time. */
  date_gmt: string;
  slug: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  tags: number[];
  featured_media: number;
  author: number;
};

export type WpMedia = { id: number; source_url: string; alt_text: string; mime_type: string };

export type PostDraft = {
  title: string;
  slug: string;
  publishedAt: string;
  excerpt: string;
  legacy: { wpId: number; wpSlug: string; wpDate: string; wpUrl: string };
  heroMediaId: number | null;
  wpCategoryIds: number[];
  bodyHtml: string;
};
