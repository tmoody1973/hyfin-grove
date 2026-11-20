import { describe, expect, it } from "vitest";
import { activeSlot, parseSize } from "@/lib/ads/slots";

const now = Date.parse("2026-11-20T20:00:00Z");
const spot = (o: Record<string, unknown> = {}) => ({ name: "Playlist banner", enabled: true, placement: "playlist-banner", adUnit: "HYFIN-Playlist-Banner", desktopSize: "728x90", mobileSize: "300x50", label: "Support for HYFIN comes from", startsAt: null, endsAt: null, ...o });
const ads = (o: Record<string, unknown> = {}) => ({ enabled: true, networkCode: "118058336", slots: [spot()], ...o });

describe("parseSize: ad sizes typed in the admin", () => {
  it("reads WIDTHxHEIGHT, forgiving spaces and a capital X", () => {
    expect(parseSize("728x90")).toEqual([728, 90]);
    expect(parseSize(" 300 X 50 ")).toEqual([300, 50]);
  });
  it("refuses anything else", () => {
    for (const bad of ["", "728", "x90", "728x", "0x90", "abcxdef", "5000x90", null, undefined]) expect(parseSize(bad)).toBeNull();
  });
});

describe("activeSlot: which ad spot a page shows right now (issue #22)", () => {
  it("builds the full ad unit path from the network code, with both sizes", () => {
    expect(activeSlot(ads(), "playlist-banner", now)).toEqual({ path: "/118058336/HYFIN-Playlist-Banner", desktop: [728, 90], mobile: [300, 50], label: "Support for HYFIN comes from" });
  });
  it("nothing when the site-wide switch, the spot's switch, or the network code is off or missing", () => {
    expect(activeSlot(ads({ enabled: false }), "playlist-banner", now)).toBeNull();
    expect(activeSlot(ads({ slots: [spot({ enabled: false })] }), "playlist-banner", now)).toBeNull();
    expect(activeSlot(ads({ networkCode: "" }), "playlist-banner", now)).toBeNull();
    expect(activeSlot(null, "playlist-banner", now)).toBeNull();
  });
  it("nothing for another placement, a bad size, or a missing ad unit", () => {
    expect(activeSlot(ads(), "story-sidebar", now)).toBeNull();
    expect(activeSlot(ads({ slots: [spot({ desktopSize: "big" })] }), "playlist-banner", now)).toBeNull();
    expect(activeSlot(ads({ slots: [spot({ adUnit: " " })] }), "playlist-banner", now)).toBeNull();
  });
  it("respects start and end dates", () => {
    expect(activeSlot(ads({ slots: [spot({ startsAt: "2026-11-21T00:00:00Z" })] }), "playlist-banner", now)).toBeNull();
    expect(activeSlot(ads({ slots: [spot({ endsAt: "2026-11-20T19:59:59Z" })] }), "playlist-banner", now)).toBeNull();
    expect(activeSlot(ads({ slots: [spot({ startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" })] }), "playlist-banner", now)).not.toBeNull();
  });
  it("the first switched-on spot for the placement wins; an ad unit typed as a full path is not doubled", () => {
    const slots = [spot({ enabled: false, adUnit: "Off" }), spot({ adUnit: "/118058336/HYFIN-Playlist-Banner", label: "" }), spot({ adUnit: "Later" })];
    expect(activeSlot(ads({ slots }), "playlist-banner", now)).toMatchObject({ path: "/118058336/HYFIN-Playlist-Banner", label: null });
  });
});

describe("AdSlot: the box before Google fills it", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { AdSlot } = await import("@/components/ads/AdSlot");
  const slot = { path: "/118058336/HYFIN-Playlist-Banner", desktop: [728, 90] as [number, number], mobile: [300, 50] as [number, number], label: "Support for HYFIN comes from" };
  it("reserves the ad's height (phone 50px, desktop 90px) so the page doesn't jump, under its label", () => {
    const html = renderToStaticMarkup(createElement(AdSlot, { slot, page: "playlist" }));
    expect(html).toContain("--ad-m:50px");
    expect(html).toContain("--ad-d:90px");
    expect(html).toContain("Support for HYFIN comes from");
    expect(html).toMatch(/<div id="ad-[^"]+"/);
  });
  it("labels an unlabelled spot Advertisement", () => {
    expect(renderToStaticMarkup(createElement(AdSlot, { slot: { ...slot, label: null }, page: "playlist" }))).toContain("Advertisement");
  });
});
