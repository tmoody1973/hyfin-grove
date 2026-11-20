import type { Field, PayloadRequest } from "payload";
import { toSearchRow } from "./rows";

/** The site-search fields added to the search plugin's collection (plan 12). Written only by the sync. */
export const SEARCH_FIELDS: Field[] = [
  { name: "kind", type: "select", index: true, options: ["story", "show", "host", "event", "page"], admin: { readOnly: true } },
  { name: "href", type: "text", admin: { readOnly: true } },
  { name: "label", type: "text", admin: { readOnly: true } },
  { name: "date", type: "date", admin: { readOnly: true } },
  { name: "imageUrl", type: "text", admin: { readOnly: true } },
  { name: "excerpt", type: "textarea", admin: { readOnly: true } },
  { name: "body", type: "textarea", admin: { readOnly: true, hidden: true } },
  { name: "visible", type: "checkbox", index: true, defaultValue: false, admin: { readOnly: true, description: "Whether the public sees it: false for withdrawn stories and hidden or unpublished events." } },
];

const MEDIA_FIELD: Record<string, string> = { posts: "heroImage", shows: "artwork", hosts: "photo", events: "image", pages: "heroImage" };

/** The picture's address: from a loaded upload, or looked up by id in the same transaction. */
async function mediaUrl(collection: string, doc: Record<string, unknown>, req: PayloadRequest): Promise<string | null> {
  const ref = doc[MEDIA_FIELD[collection] ?? ""];
  if (ref && typeof ref === "object") return ((ref as { url?: string }).url ?? null) || null;
  if (typeof ref !== "number") return null;
  try {
    const m = await req.payload.findByID({ collection: "media", id: ref, depth: 0, req, select: { url: true, filename: true } });
    return (m as { url?: string | null }).url ?? null;
  } catch {
    return null;
  }
}

/** The search plugin's beforeSync: fill the site-search fields for whatever was saved. */
export async function beforeSearchSync({ collectionSlug, originalDoc, searchDoc, req }: { collectionSlug: string; originalDoc: Record<string, unknown>; searchDoc: Record<string, unknown>; req: PayloadRequest }) {
  const row = toSearchRow(collectionSlug, originalDoc, await mediaUrl(collectionSlug, originalDoc, req));
  if (!row) return { ...searchDoc, title: String(searchDoc.title ?? ""), visible: false };
  return { ...searchDoc, ...row };
}
