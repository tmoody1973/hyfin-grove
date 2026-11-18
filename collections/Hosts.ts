import type { CollectionConfig } from "payload";

export const Hosts: CollectionConfig = {
  slug: "hosts",
  admin: { useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "bio", type: "textarea" },
    { name: "cadenceHostName", type: "text", admin: { description: "Exactly as the host appears in NPR Cadence." } },
  ],
};
