/**
 * One form for every slug comparison: URL-decoded, trimmed, lowercase. WordPress returns non-ASCII slugs
 * percent-encoded (wu%e2%80%91tang); Next may hand params over either way. Null if the encoding is broken.
 */
export function normalizeSlug(slug: string): string | null {
  try {
    const s = decodeURIComponent(slug).trim().toLowerCase();
    return s || null;
  } catch {
    return null;
  }
}

/** The stored form of every slug: trimmed, lowercase. No decoding (that belongs to the edges). */
export const canonicalSlug = (slug: string): string => slug.trim().toLowerCase();

/**
 * A slug from a route parameter. Next has usually decoded it already, so a literal "%" (100%-live) must
 * survive: decode when that works, otherwise take the parameter as-is.
 */
export function routeSlug(param: string): string | null {
  let s = param;
  try {
    s = decodeURIComponent(param);
  } catch {
    // already decoded, with a literal %
  }
  return canonicalSlug(s) || null;
}

/** Old hyfin.org post addresses look like /YYYY/MM/DD/<slug>/. */
export function parseLegacyPath(segments: { year: string; month: string; day: string; slug: string }): { wpSlug: string } | null {
  const { year, month, day, slug } = segments;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return null;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  const wpSlug = routeSlug(slug);
  return wpSlug ? { wpSlug } : null;
}
