type Node = { type?: string; relationTo?: string; value?: unknown; root?: unknown; children?: unknown[] };

/** The first Media upload in a Lexical body, depth-first (the photo a reader meets first). */
export function firstUploadId(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const n = body as Node;
  if (n.type === "upload" && n.relationTo === "media") {
    const v = n.value;
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && typeof (v as { id?: unknown }).id === "number") return (v as { id: number }).id;
    return null;
  }
  for (const child of [n.root, ...(n.children ?? [])]) {
    const id = firstUploadId(child);
    if (id !== null) return id;
  }
  return null;
}

type HeroData = { heroImage?: unknown; body?: unknown };

/**
 * A story with no feature photo uses the first photo in its text (Tarik, 2026-11-19), so cards don't show a placeholder.
 * Never replaces a chosen photo, including one already saved when this update doesn't send heroImage.
 */
export function fillHeroFromBody<T extends HeroData>(data: T, original?: HeroData | null): T & { heroImage?: unknown } {
  const hero = "heroImage" in data ? data.heroImage : original?.heroImage;
  if (hero) return data;
  const id = firstUploadId(data.body);
  return id === null ? data : { ...data, heroImage: id };
}
