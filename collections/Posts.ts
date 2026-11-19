import type { CollectionConfig } from "payload";
import { canonicalSlug } from "../lib/legacy";
import { stampReview } from "../lib/reviewRules";
import { previewUrl } from "../lib/seo";
import { CATEGORIES, CATEGORY_LABELS } from "../lib/taxonomy";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "sorting.needsReview", "sorting.reasons", "publishedAt"],
    listSearchableFields: ["title", "slug"],
    // "Preview" opens the saved post on the site (no drafts yet: save first).
    preview: (doc) => previewUrl(doc as { category?: "music" | "culture" | "milwaukee"; slug?: string }),
  },
  hooks: {
    beforeChange: [({ data, originalDoc, req }) => stampReview(data, originalDoc, Boolean(req.user), new Date().toISOString())],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      // Saved lowercase and trimmed so the address the site builds always finds the story.
      hooks: { beforeValidate: [({ value }) => (typeof value === "string" ? canonicalSlug(value) : value)] },
    },
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
      admin: { description: "Jev's sorting. Tick Reviewed once the category and tags are right; re-imports then leave them alone." },
      fields: [
        { name: "needsReview", type: "checkbox", defaultValue: false, index: true },
        {
          name: "reasons",
          type: "select",
          hasMany: true,
          options: [
            { label: "Jev unsure", value: "low-confidence" },
            { label: "Top 100 by traffic", value: "top-traffic" },
            { label: "Last 18 months", value: "recent" },
          ],
          admin: { readOnly: true },
        },
        { name: "reviewed", type: "checkbox", defaultValue: false },
        { name: "categoryConfidence", type: "number", admin: { readOnly: true } },
        { name: "reviewedAt", type: "date", admin: { readOnly: true } },
      ],
    },
  ],
};
