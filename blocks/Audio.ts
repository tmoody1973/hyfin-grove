import type { Block } from "payload";

/** An audio file (MP3) inside a story; it plays in the site's persistent player. */
export const Audio: Block = {
  slug: "audio",
  labels: { singular: "Audio", plural: "Audio" },
  fields: [
    {
      name: "url",
      type: "text",
      required: true,
      validate: (value: unknown) => {
        try {
          const u = new URL(String(value));
          return u.protocol === "https:" || u.protocol === "http:" ? true : "Audio must be an http(s) link";
        } catch {
          return "Audio must be an http(s) link";
        }
      },
    },
    { name: "title", type: "text" },
  ],
};
