/** Seeding never overwrites what staff typed: it creates missing rows and fills only empty fields. */
const isEmpty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function planSeed<T extends { slug: string }>(existing: T[], incoming: T[]): { create: T[]; update: Array<{ slug: string; data: Partial<T> }> } {
  const bySlug = new Map(existing.map((e) => [e.slug, e]));
  const create: T[] = [];
  const update: Array<{ slug: string; data: Partial<T> }> = [];
  for (const row of incoming) {
    const current = bySlug.get(row.slug);
    if (!current) {
      create.push(row);
      continue;
    }
    const data = Object.fromEntries(
      Object.entries(row).filter(([k, v]) => k !== "slug" && !isEmpty(v) && isEmpty((current as Record<string, unknown>)[k])),
    ) as Partial<T>;
    if (Object.keys(data).length > 0) update.push({ slug: row.slug, data });
  }
  return { create, update };
}
