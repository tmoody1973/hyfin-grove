import type { CollectionConfig } from "payload";
import { fillHeroFromBody } from "@/lib/heroFromBody";
import { cdsLocked } from "../lib/cds/fieldAccess";
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
    beforeChange: [
      ({ data, originalDoc, req }) => stampReview(data, originalDoc, Boolean(req.user), new Date().toISOString()),
      ({ data, originalDoc }) => fillHeroFromBody(data, originalDoc),
    ],
  },
  fields: [
    { name: "title", type: "text", required: true, access: { update: cdsLocked } },
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
    { name: "byline", type: "text", access: { update: cdsLocked } },
    { name: "bylineHost", type: "relationship", relationTo: "hosts" },
    { name: "publishedAt", type: "date", required: true, access: { update: cdsLocked } },
    { name: "excerpt", type: "textarea", access: { update: cdsLocked } },
    { name: "heroImage", type: "upload", relationTo: "media" },
    {
      name: "body",
      type: "richText",
      // Synced stories show cdsBody; an edit here would be saved but never appear (spec anti-goal).
      access: { update: cdsLocked },
      admin: { condition: (data) => data?.source !== "cds" },
    },
    {
      name: "audio",
      type: "group",
      access: { update: cdsLocked },
      fields: [
        { name: "url", type: "text" },
        { name: "durationSeconds", type: "number" },
      ],
    },
    {
      name: "source",
      type: "select",
      required: true,
      access: { update: cdsLocked },
      options: [
        { label: "WordPress archive", value: "wordpress" },
        { label: "NPR CDS", value: "cds" },
        { label: "Radio Milwaukee site", value: "station" },
      ],
    },
    {
      // Story text from CDS, as blocks the site renders directly (not rich text: converting needs an HTML
      // parser, and jsdom in the live server took production down on 2026-11-18).
      name: "cdsBody",
      type: "json",
      // Rendered as raw HTML: only the sync (server-side, privileged) may write it, never a person.
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: "cds",
      type: "group",
      access: { update: cdsLocked },
      admin: {
        description: "Synced from NPR CDS every 15 minutes. Title, text, date and audio are edited in Brightspot; category, tags and show are yours.",
        condition: (data) => data?.source === "cds",
      },
      fields: [
        { name: "documentId", type: "text", unique: true, index: true, admin: { readOnly: true, description: "CDS document id, e.g. g-s921-17816." } },
        { name: "canonicalUrl", type: "text", admin: { readOnly: true } },
        { name: "imageUrl", type: "text", admin: { readOnly: true } },
        { name: "editorialLastModified", type: "date", admin: { readOnly: true } },
        { name: "lastCheckedAt", type: "date", admin: { readOnly: true } },
        { name: "withdrawnAt", type: "date", index: true, admin: { readOnly: true, description: "Set when CDS stops returning the story; the site hides it." } },
      ],
    },
    {
      name: "station",
      type: "group",
      access: { update: cdsLocked },
      admin: {
        description: "Imported every 15 minutes from radiomilwaukee.org's HYFIN feed (Uniquely Milwaukee). Category, tags and show are yours.",
        condition: (data) => data?.source === "station",
      },
      fields: [
        { name: "url", type: "text", unique: true, index: true, admin: { readOnly: true, description: "The episode's radiomilwaukee.org address." } },
        { name: "cdsCopyId", type: "text", admin: { readOnly: true, description: "The podcast-feed copy in CDS that supplied text and audio." } },
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
