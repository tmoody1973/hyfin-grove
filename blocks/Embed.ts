import type { Block } from "payload";
import { embedFromUrl, type EmbedProvider } from "../lib/embeds";

const PROVIDERS: EmbedProvider[] = [
  "youtube", "spotify", "spreaker", "npr", "prx", "bandcamp", "odesli",
  "apple-music", "apple-podcasts", "soundcloud", "mixcloud", "instagram", "twitter", "tiktok",
];

const providerFromUrl = ({ siblingData }: { siblingData?: unknown }) =>
  embedFromUrl(String((siblingData as { url?: unknown })?.url ?? ""))?.provider ?? null;

export const SUPPORTED_EMBEDS_MESSAGE =
  "Not a supported embed (YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp, Odesli, Apple, SoundCloud, Mixcloud, Instagram, Twitter, TikTok)";

/** A player or social post inside a story. The URL is checked against the allowlist on save and again when drawn. */
export const Embed: Block = {
  slug: "embed",
  labels: { singular: "Embed", plural: "Embeds" },
  fields: [
    {
      name: "url",
      type: "text",
      required: true,
      admin: { description: "Paste the share or embed link (YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp, Instagram…)." },
      validate: (value: unknown) => (typeof value === "string" && embedFromUrl(value) ? true : SUPPORTED_EMBEDS_MESSAGE),
    },
    {
      name: "provider",
      type: "select",
      options: PROVIDERS.map((p) => ({ label: p, value: p })),
      admin: { readOnly: true, description: "Filled in from the link." },
      // Rich-text block sub-fields may skip beforeValidate on some save paths; set it again before saving.
      hooks: { beforeValidate: [providerFromUrl], beforeChange: [providerFromUrl] },
    },
    { name: "title", type: "text", admin: { description: "Shown to screen readers; describe what plays." } },
  ],
};
