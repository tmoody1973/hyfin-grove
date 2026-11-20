/**
 * What the admin's "Add from NPR" box was given (plan 11, task 3). Only an npr.org link becomes a lookup, by its path
 * through CDS; anything else is keywords. Nothing typed here ever becomes a fetch to another host.
 */
export type NprQuery = { kind: "browse" } | { kind: "path"; path: string } | { kind: "id"; id: string } | { kind: "keywords"; words: string[] };

const NPR_HOSTS = new Set(["www.npr.org", "npr.org"]);

/** Lowercase, accents removed ("Beyoncé" → "beyonce"). */
export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function parseNprQuery(raw: string): NprQuery {
  const q = raw.trim();
  if (!q) return { kind: "browse" };
  if (/^g-s\d+-\d+$/i.test(q) || /^\d{6,}$/.test(q)) return { kind: "id", id: q.toLowerCase() };
  if (!/\s/.test(q)) {
    try {
      const url = new URL(/^https?:\/\//i.test(q) ? q : `https://${q}`);
      if (NPR_HOSTS.has(url.hostname.toLowerCase()) && url.pathname.length > 1) return { kind: "path", path: url.pathname.replace(/\/+$/, "") };
    } catch {
      // not a link: keywords
    }
  }
  return { kind: "keywords", words: normalize(q).split(/[^a-z0-9]+/).filter(Boolean) };
}

/** Every word appears in the title or the teaser. */
export function matchesKeywords(story: { title: string; teaser: string | null }, words: readonly string[]): boolean {
  const hay = normalize(`${story.title} ${story.teaser ?? ""}`);
  return words.every((w) => hay.includes(w));
}
