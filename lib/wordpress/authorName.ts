import { JSDOM } from "jsdom";

/**
 * The author on a hyfin.org page. The WordPress API hides user names (401/404), but every public post page
 * carries <meta name="author">. Uses jsdom: scripts only, never the live server bundle.
 */
export const authorNameFromHtml = (html: string): string | null =>
  new JSDOM(html).window.document.querySelector('meta[name="author"]')?.getAttribute("content")?.trim() || null;
