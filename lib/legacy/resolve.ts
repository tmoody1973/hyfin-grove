import type { Payload } from "payload";
import { postPath } from "../postPath";
import type { Category } from "../taxonomy";
import { patternTarget } from "./patterns";

export type LegacyDb = Pick<Payload, "find">;

const RADIO_MILWAUKEE = "https://radiomilwaukee.org/";
const BLOB = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//;

/**
 * Where an old address may send people: a path on this site, or Radio Milwaukee's own site. Anything else
 * (protocol-relative "//", backslashes, other hosts, other schemes) is refused, so a crafted old address or a
 * mistyped Redirects row can never become an open redirect.
 */
export function safeTarget(to: string | null | undefined): string | null {
  const t = (to ?? "").trim();
  if (!t || t.includes("\\")) return null;
  if (t.startsWith("/")) return t.startsWith("//") ? null : t;
  if (t.startsWith(RADIO_MILWAUKEE)) return t;
  // Old /wp-content/uploads/ images now live in our Vercel Blob store.
  return BLOB.test(t) ? t : null;
}

const strip = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** The old address, decoded and without query or fragment; null if its encoding is broken. */
function clean(raw: string): string | null {
  try {
    const p = decodeURIComponent(raw.split(/[?#]/)[0]);
    return p.startsWith("/") ? p : `/${p}`;
  } catch {
    return null;
  }
}

type RedirectRow = { to?: { type?: string | null; url?: string | null; reference?: { value?: unknown } | null } | null };

function rowTarget(row: RedirectRow): string | null {
  const to = row.to;
  if (to?.type === "reference") {
    const v = to.reference?.value as { category?: Category; slug?: string } | undefined;
    return v && typeof v === "object" && v.category && v.slug ? postPath({ category: v.category, slug: v.slug }) : null;
  }
  return to?.url ?? null;
}

/**
 * Where an old hyfin.org address should go, or null (then the page 404s). Only called on the 404 path.
 * Order: the Redirects collection (staff's one-offs), then pattern rules.
 */
export async function resolveLegacy(raw: string, db: LegacyDb): Promise<string | null> {
  const path = clean(raw);
  if (!path) return null;
  const bare = strip(path);
  // WordPress slugs are lowercase; old links arrive as /Harlem/ and /harlem/ alike. (Patterns keep the original
  // case for /wp-content/uploads/ file names, which are case-sensitive.)
  const lower = bare.toLowerCase();
  const { docs } = await db.find({ collection: "redirects", where: { from: { in: [lower, `${lower}/`] } }, limit: 1, depth: 1 });
  const fromRow = docs[0] ? safeTarget(rowTarget(docs[0] as RedirectRow)) : null;
  const target = fromRow ?? safeTarget(await patternTarget(bare, db));
  // A rule that points back at the same address would loop.
  return target && strip(target.split(/[?#]/)[0]).toLowerCase() !== lower ? target : null;
}
