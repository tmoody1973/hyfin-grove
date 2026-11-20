import type { MetadataRoute } from "next";

/**
 * Makes HYFIN installable to the home screen (plan 15, task 1). `?source=pwa` marks visits from the installed app,
 * so decision 018's "are people installing it?" can be measured. Icons: `scripts/make-app-icons.ts`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HYFIN",
    short_name: "HYFIN",
    description: "HYFIN: Black music and culture from Radio Milwaukee. Live radio, new music, Milwaukee stories.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["music", "news", "entertainment"],
    icons: [
      { src: "/app/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Listen live", url: "/listen", icons: [{ src: "/app/icon-192.png", sizes: "192x192" }] },
      { name: "Playlist", url: "/listen/playlist", icons: [{ src: "/app/icon-192.png", sizes: "192x192" }] },
      { name: "Events", url: "/events", icons: [{ src: "/app/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
