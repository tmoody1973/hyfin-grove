/** Old hyfin.org post addresses look like /YYYY/MM/DD/<slug>/. */
export function parseLegacyPath(segments: { year: string; month: string; day: string; slug: string }): { wpSlug: string } | null {
  const { year, month, day, slug } = segments;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return null;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }
  const wpSlug = decoded.trim().toLowerCase();
  return wpSlug ? { wpSlug } : null;
}
