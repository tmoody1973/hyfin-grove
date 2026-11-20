/**
 * What each kind of content puts in site search (plan 12). Pure, so every rule is tested without a database.
 * Rows exist for everything the plugin syncs; `visible` says whether the public may see it (a withdrawn story, a hidden
 * or unpublished event: false). The search query only ever returns visible rows.
 */
import { postPath } from "@/lib/postPath";
import { CATEGORY_LABELS, isCategory } from "@/lib/taxonomy";

export type SearchKind = "story" | "show" | "host" | "event" | "page";
export type SearchRow = { kind: SearchKind; title: string; href: string; label: string; date: string | null; imageUrl: string | null; excerpt: string; body: string; visible: boolean };

export const MAX_BODY = 20_000;

type Doc = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const join = (...parts: unknown[]) => parts.map(str).filter(Boolean).join(" · ");

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'", nbsp: " " };
/** HTML to plain text by pattern (no HTML parser: jsdom in the live server took production down on 2026-11-18). */
export const htmlText = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e: string) => ENTITIES[e]).replace(/[ \t]+/g, " ").trim();

/** Plain text from Payload rich text (Lexical JSON): paragraphs on their own lines, only text nodes kept. */
export function lexicalText(data: unknown): string {
  const lines: string[] = [];
  const walk = (node: unknown, line: string[]): void => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: unknown; children?: unknown[] };
    if (typeof n.text === "string") line.push(n.text);
    if (!Array.isArray(n.children)) return;
    if (n.type === "root") {
      for (const child of n.children) {
        const own: string[] = [];
        walk(child, own);
        if (own.length) lines.push(own.join(""));
      }
    } else for (const child of n.children) walk(child, line);
  };
  walk((data as { root?: unknown } | null)?.root, []);
  return lines.join("\n");
}

const cdsText = (blocks: unknown) =>
  (Array.isArray(blocks) ? blocks : []).flatMap((b: { kind?: string; html?: unknown }) => (b?.kind === "html" && typeof b.html === "string" ? [htmlText(b.html)] : [])).join("\n");

const cap = (s: string) => s.slice(0, MAX_BODY);

/** The search row for one document, or null when it has no public address. `mediaUrl`: its picture, already looked up. */
export function toSearchRow(collection: string, doc: Doc, mediaUrl: string | null): SearchRow | null {
  const slug = str(doc.slug);
  switch (collection) {
    case "posts": {
      const category = str(doc.category);
      const cds = (doc.cds ?? {}) as { documentId?: unknown; withdrawnAt?: unknown; imageUrl?: unknown };
      const npr = doc.source === "npr";
      const href = npr ? (str(cds.documentId) ? `/npr/${encodeURIComponent(str(cds.documentId))}` : "") : slug && isCategory(category) ? postPath({ category, slug }) : "";
      if (!href) return null;
      const text = doc.source === "cds" || doc.source === "station" || npr ? cdsText(doc.cdsBody) : lexicalText(doc.body);
      return {
        kind: "story",
        title: str(doc.title),
        href,
        label: npr ? "NPR" : isCategory(category) ? CATEGORY_LABELS[category] : "Story",
        date: str(doc.publishedAt) || null,
        imageUrl: mediaUrl ?? (str(cds.imageUrl) || null),
        excerpt: [str(doc.excerpt), str(doc.byline) && `By ${str(doc.byline)}`].filter(Boolean).join(" · "),
        body: cap(text),
        visible: !cds.withdrawnAt,
      };
    }
    case "shows":
      return slug ? { kind: "show", title: str(doc.name), href: `/shows/${slug}`, label: "Show", date: null, imageUrl: mediaUrl, excerpt: str(doc.description), body: "", visible: true } : null;
    case "hosts":
      return slug ? { kind: "host", title: str(doc.name), href: `/hosts/${slug}`, label: "Host", date: null, imageUrl: mediaUrl, excerpt: str(doc.bio), body: "", visible: true } : null;
    case "events":
      return slug
        ? {
            kind: "event",
            title: str(doc.title),
            href: `/events/${encodeURIComponent(slug)}`,
            label: "Event",
            date: str(doc.startsAt) || null,
            imageUrl: mediaUrl ?? (str(doc.imageUrl) || null),
            excerpt: join(doc.venue, doc.city, doc.headliners || doc.artist, doc.supports),
            body: cap([lexicalText(doc.description), lexicalText(doc.recap)].filter(Boolean).join("\n")),
            visible: doc._status === "published" && doc.hidden !== true,
          }
        : null;
    case "pages":
      return slug ? { kind: "page", title: str(doc.title), href: `/${slug}`, label: "Page", date: null, imageUrl: mediaUrl, excerpt: "", body: cap(lexicalText(doc.body)), visible: true } : null;
    default:
      return null;
  }
}
