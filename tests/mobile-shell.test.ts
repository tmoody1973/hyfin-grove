import { describe, expect, it } from "vitest";
import { activeTab, sectionLabel, TABS } from "@/lib/mobile/tabs";
import { onAirLabel } from "@/lib/mobile/onAir";
import { mediaMetadata } from "@/lib/mobile/mediaSession";

describe("activeTab: which bottom tab is lit (plan 15, task 3)", () => {
  it("maps each section to its tab", () => {
    expect(activeTab("/")).toBe("home");
    for (const p of ["/listen", "/listen/playlist", "/listen/schedule", "/shows/rhythm-lab", "/hosts/ken"]) expect(activeTab(p)).toBe("listen");
    for (const p of ["/stories", "/music", "/music/some-story", "/culture", "/culture/x"]) expect(activeTab(p)).toBe("stories");
    for (const p of ["/milwaukee", "/milwaukee/x", "/events", "/events/123", "/events/past"]) expect(activeTab(p)).toBe("milwaukee");
  });
  it("everything else (and odd paths) falls under More", () => {
    for (const p of ["/support", "/newsletter", "/submit-music", "/constructor", "/__proto__", "/tag/x", ""]) expect(activeTab(p)).toBe("more");
  });
  it("has the mockup's five tabs in order", () => {
    expect(TABS.map((t) => t.label)).toEqual(["Home", "Listen", "Stories", "Milwaukee", "More"]);
  });
});

describe("sectionLabel: the top bar's /section", () => {
  it("is /mke at home, else the first path segment", () => {
    expect(sectionLabel("/")).toBe("/mke");
    expect(sectionLabel("/music/some-story")).toBe("/music");
    expect(sectionLabel("/listen/playlist")).toBe("/listen");
  });
  it("never shows a long or odd segment", () => {
    expect(sectionLabel("/a-very-long-page-address-that-goes-on")).toBe("/mke");
    expect(sectionLabel("/<script>")).toBe("/mke");
  });
});

describe("onAirLabel: who's on now", () => {
  const h = 3_600_000;
  const t = Date.parse("2026-11-20T21:30:00Z"); // 3:30 pm Central
  const airings = [
    { name: "Afternoons", hosts: ["Megan Mathews"], startsAt: t - 1.5 * h, endsAt: t + 1.5 * h, description: null, link: null, imageUrl: null },
    { name: "Rhythm Lab", hosts: [], startsAt: t + 1.5 * h, endsAt: t + 3.5 * h, description: null, link: null, imageUrl: null },
  ];
  it("names the hosts on air and when they end", () => {
    expect(onAirLabel(airings, t)).toBe("Megan Mathews until 5 pm");
  });
  it("uses the show name when there are no hosts, and null when nothing covers now", () => {
    expect(onAirLabel(airings, t + 2 * h)).toBe("Rhythm Lab until 7 pm");
    expect(onAirLabel(airings, t + 10 * h)).toBeNull();
    expect(onAirLabel([], t)).toBeNull();
  });
});

describe("mediaMetadata: what the lock screen shows", () => {
  it("live: the song, the artist, HYFIN and the DJ, with the cover art", () => {
    expect(mediaMetadata({ kind: "live", play: { title: "Umi Says", artist: "6LACK", artworkUrl: "https://is1.example/300x300.jpg" }, onAir: "Megan Mathews until 5 pm" })).toEqual({
      title: "Umi Says",
      artist: "6LACK",
      album: "HYFIN · Megan Mathews until 5 pm",
      artwork: [{ src: "https://is1.example/300x300.jpg", sizes: "300x300", type: "image/jpeg" }],
    });
  });
  it("live with no song info: HYFIN, with the app icon", () => {
    expect(mediaMetadata({ kind: "live", play: null, onAir: null })).toEqual({
      title: "HYFIN",
      artist: "Live from Radio Milwaukee",
      album: "HYFIN",
      artwork: [{ src: "/app/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
  });
  it("a story: its title, from HYFIN", () => {
    expect(mediaMetadata({ kind: "story", title: "La Alternativa", play: null, onAir: null })).toMatchObject({ title: "La Alternativa", artist: "HYFIN", album: "HYFIN stories" });
  });
});
