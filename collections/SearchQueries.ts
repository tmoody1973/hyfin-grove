import type { CollectionConfig } from "payload";

/**
 * What visitors searched for (plan 12; Tarik: log it, kept 90 days). Only the words, the result count and when:
 * nothing about who searched. Filter "Results = 0" to find what people can't find. The cron deletes rows after 90 days.
 */
export const SearchQueries: CollectionConfig = {
  slug: "search-queries",
  labels: { singular: "Search query", plural: "Search queries" },
  admin: { useAsTitle: "query", defaultColumns: ["query", "results", "kind", "createdAt"], group: "Search", description: "What visitors searched for on /search, kept 90 days. Filter Results equals 0 to see what they couldn't find." },
  access: { read: ({ req }) => Boolean(req.user), create: () => false, update: () => false, delete: ({ req }) => Boolean(req.user) },
  fields: [
    { name: "query", type: "text", required: true, index: true },
    { name: "results", type: "number", required: true, index: true },
    { name: "kind", type: "text" },
  ],
  timestamps: true,
};
