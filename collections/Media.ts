import type { CollectionConfig } from "payload";

/** Files live in Vercel Blob. No generated image sizes: Next.js resizes at display time (design: Media). */
export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "alt" },
  // Public site images: anyone may read. Writes still need an editor login (Payload default).
  access: { read: () => true },
  upload: true,
  fields: [
    { name: "alt", type: "text" },
    { name: "caption", type: "text" },
    { name: "credit", type: "text" },
    // The original hyfin.org URL; the import dedupes by it and old /wp-content/uploads links redirect by it.
    { name: "sourceUrl", type: "text", index: true, admin: { readOnly: true } },
  ],
};
