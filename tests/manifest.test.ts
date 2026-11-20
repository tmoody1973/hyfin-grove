import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("app/manifest.ts: HYFIN installs like an app (plan 15, task 1)", () => {
  const m = manifest();
  it("opens full-screen from the home screen, black, and marks its own visits", () => {
    expect(m).toMatchObject({ name: "HYFIN", short_name: "HYFIN", display: "standalone", scope: "/", start_url: "/?source=pwa", background_color: "#000000", theme_color: "#000000" });
  });
  it("has 192, 512 and a maskable 512 icon", () => {
    expect(m.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", type: "image/png", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", type: "image/png", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", type: "image/png", purpose: "maskable" }),
      ]),
    );
  });
  it("offers Listen live, Playlist and Events shortcuts (long-press the icon)", () => {
    expect(m.shortcuts?.map((s) => [s.name, s.url])).toEqual([
      ["Listen live", "/listen"],
      ["Playlist", "/listen/playlist"],
      ["Events", "/events"],
    ]);
  });
});
