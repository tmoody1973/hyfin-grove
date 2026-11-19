/**
 * radiomilwaukee.org's HYFIN tag feed (decision 009). Only Uniquely Milwaukee episodes are taken from it:
 * Ladies First and Rhythm Lab items in the same feed already arrive through CDS.
 */
export const STATION_FEED_URL = "https://radiomilwaukee.org/tags/hyfin.rss";
const EPISODE_PREFIX = "https://radiomilwaukee.org/podcast/uniquely-milwaukee/";
const TIMEOUT_MS = 10_000;

export type FeedEpisode = { url: string; title: string; summary: string | null; author: string | null; imageUrl: string | null; publishedAt: string };

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (NAMED[e.toLowerCase()] ?? m),
  );

/** Text of one child element: CDATA kept as-is, otherwise entities decoded. */
function child(item: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(item);
  if (!m) return null;
  const raw = m[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(raw);
  const text = cdata ? cdata[1] : decode(raw);
  return text.trim() || null;
}
const attr = (item: string, tag: string, name: string): string | null => {
  const m = new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]+)"`, "i").exec(item);
  return m ? decode(m[1]) : null;
};

// ponytail: regex over a small, flat feed we read every 15 minutes; switch to a real XML parser if it grows nested.
export function parseStationFeed(xml: string): FeedEpisode[] {
  if (!/<rss[\s>]/i.test(xml) || !/<channel[\s>]/i.test(xml)) throw new Error("Station feed is not RSS");
  return [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)].flatMap(([, item]) => {
    const url = child(item, "link");
    const title = child(item, "title");
    const date = new Date(child(item, "pubDate") ?? "");
    if (!url?.startsWith(EPISODE_PREFIX) || !title || Number.isNaN(date.getTime())) return [];
    return [{ url, title, summary: child(item, "description"), author: child(item, "dc:creator"), imageUrl: attr(item, "media:content", "url") ?? attr(item, "media:thumbnail", "url"), publishedAt: date.toISOString() }];
  });
}

export async function fetchStationFeed(fetchImpl: typeof fetch = fetch): Promise<FeedEpisode[]> {
  const res = await fetchImpl(STATION_FEED_URL, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/rss+xml, application/xml" } });
  if (!res.ok) throw new Error(`Station feed: HTTP ${res.status}`);
  return parseStationFeed(await res.text());
}
