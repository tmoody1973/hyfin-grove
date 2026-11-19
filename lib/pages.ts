import type { Payload } from "payload";
import type { Page } from "@/payload-types";

/** A content page by its old one-segment address (/thewiz), or null. */
export async function findPage(db: Pick<Payload, "find">, raw: string): Promise<Page | null> {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) return null;
  const { docs } = await db.find({ collection: "pages", where: { slug: { equals: slug } }, limit: 1, depth: 1 });
  return (docs[0] as Page | undefined) ?? null;
}
