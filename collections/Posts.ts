import type { CollectionConfig } from "payload";
import { CATEGORIES, CATEGORY_LABELS } from "../lib/taxonomy";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: { useAsTitle: "title", defaultColumns: ["title", "category", "source", "publishedAt"] },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    {
      name: "category",
      type: "select",
      required: true,
      options: CATEGORIES.map((value) => ({ label: CATEGORY_LABELS[value], value })),
    },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true },
    { name: "show", type: "relationship", relationTo: "shows" },
    { name: "byline", type: "text" },
    { name: "bylineHost", type: "relationship", relationTo: "hosts" },
    { name: "publishedAt", type: "date", required: true },
    { name: "excerpt", type: "textarea" },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "body", type: "richText" },
    {
      name: "audio",
      type: "group",
      fields: [
        { name: "url", type: "text" },
        { name: "durationSeconds", type: "number" },
      ],
    },
    {
      name: "source",
      type: "select",
      required: true,
      options: [
        { label: "WordPress archive", value: "wordpress" },
        { label: "NPR CDS", value: "cds" },
      ],
    },
    {
      name: "legacy",
      type: "group",
      admin: { description: "Where this post lived on hyfin.org. Used for old-link redirects." },
      fields: [
        { name: "wpId", type: "number", unique: true },
        { name: "wpSlug", type: "text", index: true },
        { name: "wpDate", type: "date" },
        { name: "wpUrl", type: "text" },
      ],
    },
    {
      name: "sorting",
      type: "group",
      fields: [
        { name: "categoryConfidence", type: "number" },
        { name: "needsReview", type: "checkbox", defaultValue: false },
        { name: "reviewedAt", type: "date" },
      ],
    },
  ],
};
