import type { CollectionConfig } from "payload";
import { canonicalSlug } from "@/lib/legacy";
import { SITE_URL } from "@/lib/seo";

/**
 * hyfin.org's content pages (The Wiz, Anti-Gala, Milwaukee Made, About…), kept at their old one-segment addresses
 * (plan 7, task 5). Slugs never collide with a section: /music, /culture, /milwaukee are checked first.
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
    preview: (doc) => (doc?.slug ? `${SITE_URL}/${doc.slug as string}` : null),
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { position: "sidebar", description: "The page's address: hyfin.org/<slug>." },
      hooks: { beforeValidate: [({ value }) => (typeof value === "string" ? canonicalSlug(value) : value)] },
    },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "body", type: "richText" },
    {
      name: "legacy",
      type: "group",
      admin: { description: "Where this page lived on hyfin.org." },
      fields: [
        { name: "wpId", type: "number", unique: true, admin: { readOnly: true } },
        { name: "wpUrl", type: "text", admin: { readOnly: true } },
      ],
    },
  ],
};
