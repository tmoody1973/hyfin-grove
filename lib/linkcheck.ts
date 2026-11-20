/** Pure helpers for the old-link check (plan 7): what kind of old address, is it on the junk list, did it land. */

export type Kind = "home" | "dated post" | "date archive" | "category" | "tag" | "author" | "event" | "podcast" | "paging" | "feed" | "upload" | "page" | "other";

const FIRST: Record<string, Kind> = {
  category: "category", tag: "tag", author: "author", events: "event", event: "event", venue: "event", organizer: "event",
  "hyfin-event": "event", podcast: "podcast", page: "paging", feed: "feed",
};

export function classify(raw: string): Kind {
  const path = raw.split(/[?#]/)[0];
  if (path === "/") return "home";
  if (/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/.test(path)) return "dated post";
  if (/^\/\d{4}(\/\d{2}){0,2}\/?$/.test(path)) return "date archive";
  if (path.startsWith("/wp-content/uploads/")) return "upload";
  if (/\/feed\/?$/.test(path)) return "feed";
  const first = path.split("/")[1] ?? "";
  if (Object.hasOwn(FIRST, first)) return FIRST[first];
  if (/^\/[^/]+\/?$/.test(path)) return "page";
  return "other";
}

export type Exclusion = { pattern: RegExp; reason: string };

/** `data/link-check-exclusions.txt`: one regex per line, then `# reason`. Blank and comment-only lines skipped. */
export function parseExclusions(text: string): Exclusion[] {
  return text.split("\n").flatMap((line) => {
    const m = /^\s*([^#\s][^#]*?)\s+#\s*(.+?)\s*$/.exec(line);
    return m ? [{ pattern: new RegExp(m[1]), reason: m[2] }] : [];
  });
}

export const isExcluded = (path: string, list: Exclusion[]): boolean => list.some((e) => e.pattern.test(path));

export type Landing = { status: number; hops: number; finalUrl: string };
/** The only off-site place an old address may send people: Radio Milwaukee (e.g. its donate page). */
const ALLOWED_OFFSITE = "https://radiomilwaukee.org/";

/** Pass = a final 200, at most 2 redirects (the trailing-slash hop plus ours), on our site or Radio Milwaukee's. */
export function judge(l: Landing, base: string): "pass" | "fail" {
  const onSite = l.finalUrl.startsWith(`${base}/`) || l.finalUrl === base || l.finalUrl.startsWith(ALLOWED_OFFSITE) || l.finalUrl.startsWith("https://bvqe7etkv8phdxgr.public.blob.vercel-storage.com/");
  return l.status === 200 && l.hops <= 2 && onSite ? "pass" : "fail";
}

/** The GA export: `#` comment lines, a header row, then `path,views,...`. */
export function parseGaCsv(text: string): Array<{ path: string; views: number }> {
  return text
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .slice(1)
    .flatMap((l) => {
      // The first field is quoted when the address contains a comma; "" inside quotes is a literal quote.
      const m = /^"((?:[^"]|"")*)",([^,]*)/.exec(l) ?? /^([^,]*),([^,]*)/.exec(l);
      const path = m?.[1].replace(/""/g, '"');
      return path?.startsWith("/") ? [{ path, views: Number(m?.[2]) || 0 }] : [];
    });
}
