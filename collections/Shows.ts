import type { CollectionConfig } from "payload";

/** Radio programs and editorial series in one collection: Ladies First is both (design: Shows). */
export const Shows: CollectionConfig = {
  slug: "shows",
  admin: { useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "description", type: "textarea" },
    { name: "artwork", type: "upload", relationTo: "media" },
    { name: "hosts", type: "relationship", relationTo: "hosts", hasMany: true },
    { name: "cadenceProgramName", type: "text", admin: { description: "Exactly as the program appears in NPR Cadence." } },
    { name: "podcastFeedUrl", type: "text", admin: { description: "Reserved for podcasts, after launch." } },
    { name: "wpCategoryIds", type: "number", hasMany: true, admin: { description: "WordPress categories that map to this show." } },
  ],
};
