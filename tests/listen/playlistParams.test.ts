import { describe, expect, it } from "vitest";
import { parsePlaylistParams, playlistHref } from "@/lib/listen/params";

const now = Date.parse("2026-11-19T18:00:00Z");

describe("playlist URL parameters", () => {
  it("search query survives the URL", () => {
    const q = 'Beyoncé & "Jay-Z"';
    const url = new URL(playlistHref({ day: "2026-11-19", q, nearbyOnly: false }), "https://x.test");
    expect(parsePlaylistParams(Object.fromEntries(url.searchParams), now).q).toBe(q);
  });
  it("falls back to today for a bad or too-old day", () => {
    expect(parsePlaylistParams({ day: "2026-13-01" }, now).day).toBe("2026-11-19");
    expect(parsePlaylistParams({ day: "2026-11-01" }, now).day).toBe("2026-11-19");
    expect(parsePlaylistParams({ day: "2026-11-13" }, now).day).toBe("2026-11-13"); // 6 days back is allowed
    expect(parsePlaylistParams({ day: "2026-11-20" }, now).day).toBe("2026-11-19"); // no future days
  });
  it("reads the nearby toggle and ignores repeated params", () => {
    expect(parsePlaylistParams({ nearby: "1" }, now).nearbyOnly).toBe(true);
    expect(parsePlaylistParams({}, now).nearbyOnly).toBe(false);
    expect(parsePlaylistParams({ q: ["a", "b"] }, now).q).toBe("a");
  });
  it("keeps the URL short: defaults are left out", () => {
    expect(playlistHref({ day: "2026-11-19", q: "", nearbyOnly: false }, "2026-11-19")).toBe("/listen/playlist");
  });
});
