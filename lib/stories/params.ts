type SearchParams = Record<string, string | string[] | undefined>;

/** `?page=` as a page number: 1 when absent, null (→ 404) for anything that isn't a plain positive whole number. */
export function parsePage(sp: SearchParams): number | null {
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  if (raw === undefined || raw === "") return 1;
  if (!/^[1-9]\d{0,5}$/.test(raw)) return null;
  return Number(raw);
}

/** A list page's address; page 1 has no query string, so it has one canonical URL. */
export const pageHref = (path: string, page: number) => (page > 1 ? `${path}?page=${page}` : path);
