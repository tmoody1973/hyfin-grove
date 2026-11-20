import type { Payload } from "payload";
import { postPath } from "../postPath";
import type { Category } from "../taxonomy";
import { patternTarget } from "./patterns";

export type LegacyDb = Pick<Payload, "find">;

const RADIO_MILWAUKEE = "https://radiomilwaukee.org/";
/** Our own Vercel Blob store (old /wp-content/uploads/ images), not any Vercel customer's. */
const OUR_BLOB = "https://bvqe7etkv8phdxgr.public.blob.vercel-storage.com/";
// Whitespace and control characters: browsers strip tabs/newlines, which would turn "/\t/evil.com" into "//evil.com".
const UNSAFE = /[\s\u0000-\u001f\u007f\\]/;
const MAX_HOPS = 5;

/**
 * Where an old address may send people: a path on this site, Radio Milwaukee's own site, or our Blob store.
 * Anything else (protocol-relative "//", backslashes, whitespace or control characters, other hosts, other
 * schemes) is refused, so a crafted old address or a mistyped Redirects row can never become an open redirect.
 */
export function safeTarget(to: string | null | undefined): string | null {
  const t = (to ?? "").trim();
  if (!t || UNSAFE.test(t)) return null;
  if (t.startsWith("/")) return t.startsWith("//") ? null : t;
  return t.startsWith(RADIO_MILWAUKEE) || t.startsWith(OUR_BLOB) ? t : null;
}

const strip = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
const key = (target: string) => strip(target.split(/[?#]/)[0]).toLowerCase();

/** The old address, decoded and without query or fragment; null if its encoding is broken or has control characters. */
function clean(raw: string): string | null {
  try {
    const p = decodeURIComponent(raw.split(/[?#]/)[0]);
    if (/[\u0000-\u001f\u007f]/.test(p)) return null; // e.g. %00: Postgres rejects NUL in text
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

async function rowFor(lower: string, db: LegacyDb): Promise<string | null> {
  const { docs } = await db.find({ collection: "redirects", where: { from: { in: [lower, `${lower}/`] } }, limit: 1, depth: 1 });
  return docs[0] ? safeTarget(rowTarget(docs[0] as RedirectRow)) : null;
}

/**
 * Follow Redirects rows from `target` (staff may chain /a → /b → /c) so visitors get one hop; null on a loop,
 * including a rule that points back at where it started.
 */
async function follow(target: string, startKey: string, db: LegacyDb): Promise<string | null> {
  const seen = new Set([startKey]);
  let current = target;
  for (let hop = 0; hop < MAX_HOPS && current.startsWith("/"); hop++) {
    const k = key(current);
    if (seen.has(k)) return null;
    seen.add(k);
    const next = await rowFor(k, db);
    if (!next) return current;
    current = next;
  }
  return current.startsWith("/") && seen.has(key(current)) ? null : current;
}

async function resolveClean(bare: string, db: LegacyDb): Promise<string | null> {
  // WordPress slugs are lowercase; old links arrive as /Harlem/ and /harlem/ alike. (Patterns keep the original
  // case for /wp-content/uploads/ file names, which are case-sensitive.)
  const lower = bare.toLowerCase();
  const target = (await rowFor(lower, db)) ?? safeTarget(await patternTarget(bare, db));
  return target ? follow(target, lower, db) : null;
}

/**
 * Where an old hyfin.org address should go, or null (then the page 404s). Only called on the 404 path.
 * Order: the Redirects collection (staff's one-offs), then pattern rules. A bounded number of queries per call.
 */
export async function resolveLegacy(raw: string, db: LegacyDb): Promise<string | null> {
  const path = clean(raw);
  if (!path) return null;
  const bare = strip(path);
  const found = await resolveClean(bare, db);
  // Old paginated listings (/hyfin-event-calendar/page/2/) go where their first page goes: all /page/N stripped
  // at once, one retry, so a URL of 1,000 "/page/1"s costs the same as one.
  const PAGED = /(\/page\/\d+)+$/;
  if (found || !PAGED.test(bare)) return found;
  return resolveClean(strip(bare.replace(PAGED, "")) || "/", db);
}
